import type { Request, Response } from "express";
import mongoose from "mongoose";
import type { AdminRequest } from "../middlewares/isAdmin.js";
import TryCatch from "../middlewares/trycatch.js";
import { getCurrentEarningWindow, getWindowFromStart, isValidWindowStart, roundMoney } from "../config/earningWindow.js";
import { Business, Order, Rider, Settlement, User } from "../models/entities.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MERCHANT_COMMISSION_RATE = 0.02;

const getSettlementWindow = (rawStart: unknown) => {
  const current = getCurrentEarningWindow();
  if (rawStart === undefined) return current;
  if (typeof rawStart !== "string") return null;

  const start = new Date(rawStart);
  if (!Number.isFinite(start.getTime()) || !isValidWindowStart(start) || start > current.start) {
    return null;
  }
  return getWindowFromStart(start);
};

const getSettlementAggregates = (start: Date, end: Date) => Order.aggregate<{
  merchants: Array<{ _id: string; grossSales: number; orderCount: number }>;
  riders: Array<{ _id: string; earnings: number; deliveryCount: number }>;
  totals: Array<{
    orderCount: number;
    grossSales: number;
    deliveryFees: number;
    customerPlatformFees: number;
  }>;
}>([
  {
    $match: {
      paymentStatus: "paid",
      status: "delivered",
      deliveredAt: { $gte: start, $lt: end },
    },
  },
  {
    $facet: {
      merchants: [
        { $group: { _id: "$businessId", grossSales: { $sum: "$subtotal" }, orderCount: { $sum: 1 } } },
      ],
      riders: [
        { $match: { riderUserId: { $type: "string", $ne: "" } } },
        { $group: { _id: "$riderUserId", earnings: { $sum: "$deliveryFee" }, deliveryCount: { $sum: 1 } } },
      ],
      totals: [
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            grossSales: { $sum: "$subtotal" },
            deliveryFees: { $sum: "$deliveryFee" },
            customerPlatformFees: { $sum: "$platformFee" },
          },
        },
      ],
    },
  },
]);

const hasPayoutDetails = (profile: {
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  upiQrCode?: string;
}) => Boolean(
  (profile.accountNumber && profile.ifscCode) ||
  profile.upiId ||
  profile.upiQrCode,
);

const maskSensitiveValue = (value: string | number | null | undefined) => {
  if (value === undefined || value === null || value === "") return value;
  const text = String(value);
  return text.length <= 4
    ? "•".repeat(text.length)
    : `${"•".repeat(text.length - 4)}${text.slice(-4)}`;
};

const getStatusFilter = (status: unknown): boolean | undefined => {
  if (status === "pending") return false;
  if (status === "verified") return true;
  return undefined;
};

export const getDashboardOverview = TryCatch(async (req: Request, res: Response) => {
  const rawDays = req.query.days;
  const days = rawDays === undefined ? 7 : Number(rawDays);
  if (![7, 30, 90].includes(days)) {
    return res.status(400).json({ message: "Days must be 7, 30 or 90" });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const periodStart = new Date(today);
  periodStart.setUTCDate(periodStart.getUTCDate() - days + 1);
  const previousStart = new Date(periodStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);

  const [orderOverview, totalUsers, customers, newUsers, totalBusinesses, totalRiders] =
    await Promise.all([
      Order.aggregate<{
        lifetime: Array<{ orders: number; paidOrders: number; grossSales: number; platformEarnings: number }>;
        period: Array<{ orders: number; paidOrders: number; grossSales: number; platformEarnings: number; pendingPayments: number; canceledOrders: number }>;
        previous: Array<{ grossSales: number; platformEarnings: number }>;
        trends: Array<{ date: string; orders: number; sales: number; earnings: number }>;
        recentOrders: Array<{ id: string; businessName: string; customerName: string; totalAmount: number; paymentStatus: string; status: string; createdAt: Date }>;
        topBusinesses: Array<{ name: string; orders: number; revenue: number }>;
      }>([
        {
          $facet: {
            lifetime: [
              { $group: {
                _id: null,
                orders: { $sum: 1 },
                paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
                grossSales: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
                platformEarnings: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$platformFee", 0] } },
              } },
            ],
            period: [
              { $match: { createdAt: { $gte: periodStart } } },
              { $group: {
                _id: null,
                orders: { $sum: 1 },
                paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
                grossSales: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
                platformEarnings: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$platformFee", 0] } },
                pendingPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } },
                canceledOrders: { $sum: { $cond: [{ $eq: ["$status", "canceled"] }, 1, 0] } },
              } },
            ],
            previous: [
              { $match: { createdAt: { $gte: previousStart, $lt: periodStart } } },
              { $group: {
                _id: null,
                grossSales: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
                platformEarnings: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$platformFee", 0] } },
              } },
            ],
            trends: [
              { $match: { createdAt: { $gte: periodStart } } },
              { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                orders: { $sum: 1 },
                sales: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
                earnings: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$platformFee", 0] } },
              } },
              { $sort: { _id: 1 } },
              { $project: { _id: 0, date: "$_id", orders: 1, sales: 1, earnings: 1 } },
            ],
            recentOrders: [
              { $sort: { createdAt: -1 } },
              { $limit: 6 },
              { $project: {
                _id: 0,
                id: { $toString: "$_id" },
                businessName: 1,
                customerName: 1,
                totalAmount: 1,
                paymentStatus: 1,
                status: 1,
                createdAt: 1,
              } },
            ],
            topBusinesses: [
              { $match: { paymentStatus: "paid" } },
              { $group: {
                _id: "$businessName",
                orders: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              } },
              { $sort: { revenue: -1 } },
              { $limit: 5 },
              { $project: { _id: 0, name: "$_id", orders: 1, revenue: 1 } },
            ],
          },
        },
      ]),
      User.countDocuments(),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ createdAt: { $gte: periodStart } }),
      Business.countDocuments(),
      Rider.countDocuments(),
    ]);

  const result = orderOverview[0];
  const lifetime = result?.lifetime[0];
  const period = result?.period[0];
  const previous = result?.previous[0];
  const trendsByDate = new Map((result?.trends ?? []).map((day) => [day.date, day]));
  const trends = Array.from({ length: days }, (_, index) => {
    const date = new Date(periodStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return trendsByDate.get(key) ?? { date: key, orders: 0, sales: 0, earnings: 0 };
  });

  return res.json({
    rangeDays: days,
    summary: {
      orders: lifetime?.orders ?? 0,
      paidOrders: lifetime?.paidOrders ?? 0,
      grossSales: lifetime?.grossSales ?? 0,
      platformEarnings: lifetime?.platformEarnings ?? 0,
      users: totalUsers,
      customers,
      newUsers,
      businesses: totalBusinesses,
      riders: totalRiders,
    },
    performance: {
      orders: period?.orders ?? 0,
      paidOrders: period?.paidOrders ?? 0,
      grossSales: period?.grossSales ?? 0,
      platformEarnings: period?.platformEarnings ?? 0,
      pendingPayments: period?.pendingPayments ?? 0,
      canceledOrders: period?.canceledOrders ?? 0,
      previousGrossSales: previous?.grossSales ?? 0,
      previousPlatformEarnings: previous?.platformEarnings ?? 0,
    },
    trends,
    topBusinesses: result?.topBusinesses ?? [],
    recentOrders: result?.recentOrders ?? [],
  });
});

export const getOrderDetails = TryCatch(async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = typeof rawId === "string"
    ? rawId.trim().replace(/^order\s*/i, "").replace(/^#/, "").toLowerCase()
    : "";
  if (!id || !/^[0-9a-f]{6,24}$/.test(id)) {
    return res.status(400).json({ message: "Enter a full order ID or at least its last 6 hexadecimal characters" });
  }

  const revealSensitive = req.query.revealSensitive === "true";
  let orderId = id;
  if (id.length < 24) {
    const matches = await Order.aggregate<{ _id: mongoose.Types.ObjectId }>([
      {
        $match: {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: `${id}$`,
              options: "i",
            },
          },
        },
      },
      { $limit: 2 },
      { $project: { _id: 1 } },
    ]);

    if (matches.length === 0) {
      return res.status(404).json({ message: "No order matches that ID" });
    }
    if (matches.length > 1) {
      return res.status(409).json({
        message: "More than one order matches those characters. Enter the full 24-character order ID.",
      });
    }
    orderId = matches[0]!._id.toString();
  }

  const order = await Order.findById(orderId).lean();
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.set("Cache-Control", "no-store, private");

  const [customer, business, rider] = await Promise.all([
    mongoose.isValidObjectId(order.userId)
      ? User.findById(order.userId).select("name email image role createdAt updatedAt").lean()
      : null,
    mongoose.isValidObjectId(order.businessId)
      ? Business.findById(order.businessId)
          .select("name description image ownerId phone isVerified isOpen autoLocation createdAt updatedAt")
          .lean()
      : null,
    order.riderId && mongoose.isValidObjectId(order.riderId)
      ? Rider.findById(order.riderId)
          .select("userId picture phoneNumber riderType addharNumber drivingLicenseNumber idProofFront idProofBack accountNumber ifscCode upiId upiQrCode isVerified isAvailble isBusy lastActiveAt createdAt updatedAt")
          .lean()
      : order.riderUserId
        ? Rider.findOne({ userId: order.riderUserId })
            .select("userId picture phoneNumber riderType addharNumber drivingLicenseNumber idProofFront idProofBack accountNumber ifscCode upiId upiQrCode isVerified isAvailble isBusy lastActiveAt createdAt updatedAt")
            .lean()
        : null,
  ]);

  const businessOwner = business?.ownerId && mongoose.isValidObjectId(business.ownerId)
    ? await User.findById(business.ownerId).select("name email image role createdAt updatedAt").lean()
    : null;
  const riderUserId = order.riderUserId || rider?.userId;
  const riderUser = riderUserId && mongoose.isValidObjectId(riderUserId)
    ? await User.findById(riderUserId).select("name email image role createdAt updatedAt").lean()
    : null;

  return res.json({
    order: {
      id: order._id.toString(),
      userId: order.userId,
      customerName: order.customerName,
      businessId: order.businessId,
      businessName: order.businessName,
      riderId: order.riderId,
      riderUserId: order.riderUserId,
      riderPhone: revealSensitive ? order.riderPhone : maskSensitiveValue(order.riderPhone),
      riderName: order.riderName,
      distance: order.distance,
      riderAmount: order.riderAmount,
      services: order.services,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      platformFee: order.platformFee,
      totalAmount: order.totalAmount,
      addressId: order.addressId,
      deliveryAddress: {
        ...order.deliveryAddress,
        mobile: revealSensitive
          ? order.deliveryAddress?.mobile
          : maskSensitiveValue(order.deliveryAddress?.mobile) ?? "",
      },
      status: order.status,
      reachedAt: order.reachedAt,
      pickedUpAt: order.pickedUpAt,
      deliveredAt: order.deliveredAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
    customer,
    merchant: business
      ? {
          id: business._id.toString(),
          name: business.name,
          ownerId: business.ownerId,
          description: business.description,
          image: business.image,
          phone: revealSensitive ? business.phone : maskSensitiveValue(business.phone) ?? "",
          address: business.autoLocation?.formattedAddress,
          location: business.autoLocation?.coordinates,
          isOpen: business.isOpen,
          isVerified: business.isVerified,
          createdAt: business.createdAt,
          updatedAt: business.updatedAt,
          owner: businessOwner,
        }
      : null,
    rider: rider
      ? {
          id: rider._id.toString(),
          user: riderUser,
          picture: rider.picture,
          phoneNumber: revealSensitive ? rider.phoneNumber : maskSensitiveValue(rider.phoneNumber) ?? "",
          riderType: rider.riderType,
          aadhaarNumber: revealSensitive ? rider.addharNumber : maskSensitiveValue(rider.addharNumber),
          drivingLicenseNumber: revealSensitive
            ? rider.drivingLicenseNumber
            : maskSensitiveValue(rider.drivingLicenseNumber),
          idProofFront: rider.idProofFront,
          idProofBack: rider.idProofBack,
          accountNumber: revealSensitive ? rider.accountNumber : maskSensitiveValue(rider.accountNumber),
          ifscCode: revealSensitive ? rider.ifscCode : maskSensitiveValue(rider.ifscCode),
          upiId: revealSensitive ? rider.upiId : maskSensitiveValue(rider.upiId),
          upiQrCode: rider.upiQrCode,
          isVerified: rider.isVerified,
          isAvailable: rider.isAvailble,
          isBusy: rider.isBusy,
          lastActiveAt: rider.lastActiveAt,
          createdAt: rider.createdAt,
          updatedAt: rider.updatedAt,
        }
      : null,
  });
});

export const getVerificationOverview = TryCatch(async (req: Request, res: Response) => {
  if (
    req.query.status !== undefined &&
    req.query.status !== "pending" &&
    req.query.status !== "verified"
  ) {
    return res.status(400).json({ message: "Status must be pending or verified" });
  }

  const statusFilter = getStatusFilter(req.query.status);
  const businessQuery = statusFilter === undefined ? {} : { isVerified: statusFilter };
  const riderQuery = statusFilter === undefined ? {} : { isVerified: statusFilter };

  const [businesses, riders, pendingBusinesses, verifiedBusinesses, pendingRiders, verifiedRiders] =
    await Promise.all([
      Business.find(businessQuery).sort({ createdAt: -1 }).lean(),
      Rider.find(riderQuery).sort({ createdAt: -1 }).lean(),
      Business.countDocuments({ isVerified: false }),
      Business.countDocuments({ isVerified: true }),
      Rider.countDocuments({ isVerified: false }),
      Rider.countDocuments({ isVerified: true }),
    ]);

  const userIds = [
    ...businesses.map((business) => business.ownerId),
    ...riders.map((rider) => rider.userId),
  ].filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  return res.json({
    counts: {
      pendingBusinesses,
      verifiedBusinesses,
      pendingRiders,
      verifiedRiders,
    },
    businesses: businesses.map((business) => ({
      id: business._id.toString(),
      name: business.name,
      description: business.description ?? "",
      image: business.image,
      phone: business.phone,
      address: business.autoLocation?.formattedAddress ?? "Address unavailable",
      isVerified: business.isVerified,
      createdAt: business.createdAt,
      owner: usersById.get(business.ownerId),
    })),
    riders: riders.map((rider) => ({
      id: rider._id.toString(),
      picture: rider.picture,
      phoneNumber: rider.phoneNumber,
      aadhaarNumber: rider.addharNumber,
      drivingLicenseNumber: rider.drivingLicenseNumber,
      isAvailble: rider.isAvailble,
      isBusy: rider.isBusy ?? false,
      isVerified: rider.isVerified,
      createdAt: rider.createdAt,
      user: usersById.get(rider.userId),
    })),
  });
});

export const updateBusinessVerification = TryCatch(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isVerified } = req.body as { isVerified?: unknown };
  if (!id || !mongoose.isValidObjectId(id) || typeof isVerified !== "boolean") {
    return res.status(400).json({ message: "A valid business and verification status are required" });
  }

  const business = await Business.findByIdAndUpdate(
    id,
    { $set: { isVerified } },
    { new: true, runValidators: true },
  );
  if (!business) {
    return res.status(404).json({ message: "Business not found" });
  }

  return res.json({
    message: isVerified ? "Business verified" : "Business verification revoked",
    isVerified: business.isVerified,
  });
});

export const updateRiderVerification = TryCatch(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isVerified } = req.body as { isVerified?: unknown };
  if (!id || !mongoose.isValidObjectId(id) || typeof isVerified !== "boolean") {
    return res.status(400).json({ message: "A valid rider and verification status are required" });
  }

  const rider = await Rider.findByIdAndUpdate(
    id,
    { $set: { isVerified } },
    { new: true, runValidators: true },
  );
  if (!rider) {
    return res.status(404).json({ message: "Rider not found" });
  }

  return res.json({
    message: isVerified ? "Rider verified" : "Rider verification revoked",
    isVerified: rider.isVerified,
  });
});

export const getSettlementOverview = TryCatch(async (req: Request, res: Response) => {
  const window = getSettlementWindow(req.query.start);
  if (!window) {
    return res.status(400).json({ message: "Choose a valid 10:40 PM India-time earning window" });
  }

  const [aggregateResult] = await getSettlementAggregates(window.start, window.end);
  const merchantTotals = aggregateResult?.merchants ?? [];
  const riderTotals = aggregateResult?.riders ?? [];
  const summary = aggregateResult?.totals[0] ?? {
    orderCount: 0,
    grossSales: 0,
    deliveryFees: 0,
    customerPlatformFees: 0,
  };
  const merchantIds = merchantTotals.map((entry) => entry._id);
  const riderUserIds = riderTotals.map((entry) => entry._id);
  const [businesses, riders, settlements] = await Promise.all([
    Business.find({ _id: { $in: merchantIds } }).lean(),
    Rider.find({ userId: { $in: riderUserIds } }).lean(),
    Settlement.find({ periodStart: window.start, periodEnd: window.end }).lean(),
  ]);
  const ownerIds = businesses.map((entry) => entry.ownerId).filter(Boolean);
  const userIds = [
    ...ownerIds,
    ...riders.map((entry) => entry.userId),
  ];
  const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
  const usersById = new Map(users.map((entry) => [entry._id.toString(), entry]));
  const businessesById = new Map(businesses.map((entry) => [entry._id.toString(), entry]));
  const ridersByUserId = new Map(riders.map((entry) => [entry.userId, entry]));
  const settlementsByKey = new Map(
    settlements.map((entry) => [`${entry.entityType}:${entry.entityId}`, entry]),
  );

  const merchants = merchantTotals.map((entry) => {
    const profile = businessesById.get(entry._id);
    const commission = roundMoney(roundMoney(entry.grossSales) * MERCHANT_COMMISSION_RATE);
    const settlement = settlementsByKey.get(`merchant:${entry._id}`);
    return {
      id: entry._id,
      name: profile?.name ?? "Merchant",
      owner: usersById.get(profile?.ownerId ?? "")?.name ?? "Business owner",
      orderCount: entry.orderCount,
      grossSales: roundMoney(entry.grossSales),
      platformCommission: commission,
      earnings: roundMoney(entry.grossSales - commission),
      settled: Boolean(settlement),
      settledAt: settlement?.settledAt ?? null,
      reference: settlement?.reference ?? null,
      payoutDetailsAvailable: profile ? hasPayoutDetails(profile) : false,
      accountNumber: profile?.accountNumber ?? null,
      ifscCode: profile?.ifscCode ?? null,
      upiId: profile?.upiId ?? null,
      upiQrCode: profile?.upiQrCode ?? null,
    };
  });

  const riderEntries = riderTotals.map((entry) => {
    const profile = ridersByUserId.get(entry._id);
    const settlement = settlementsByKey.get(`rider:${entry._id}`);
    return {
      id: entry._id,
      name: usersById.get(entry._id)?.name ?? "Rider",
      phoneNumber: profile?.phoneNumber ?? null,
      deliveryCount: entry.deliveryCount,
      earnings: roundMoney(entry.earnings),
      settled: Boolean(settlement),
      settledAt: settlement?.settledAt ?? null,
      reference: settlement?.reference ?? null,
      payoutDetailsAvailable: profile ? hasPayoutDetails(profile) : false,
      accountNumber: profile?.accountNumber ?? null,
      ifscCode: profile?.ifscCode ?? null,
      upiId: profile?.upiId ?? null,
      upiQrCode: profile?.upiQrCode ?? null,
    };
  });

  const now = new Date();
  const currentWindow = getCurrentEarningWindow(now);
  const windows = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWindow.start.getTime() - index * DAY_MS);
    const option = getWindowFromStart(start);
    return {
      start: option.start.toISOString(),
      end: option.end.toISOString(),
      closed: option.end.getTime() <= now.getTime(),
    };
  });
  const merchantCommission = roundMoney(
    merchants.reduce((total, entry) => total + entry.platformCommission, 0),
  );
  const customerPlatformFees = roundMoney(summary.customerPlatformFees);

  return res.json({
    window: { start: window.start.toISOString(), end: window.end.toISOString() },
    windows,
    canSettle: window.end.getTime() <= now.getTime(),
    summary: {
      orderCount: summary.orderCount,
      grossSales: roundMoney(summary.grossSales),
      deliveryFees: roundMoney(summary.deliveryFees),
      merchantCommission,
      customerPlatformFees,
      platformEarnings: roundMoney(merchantCommission + customerPlatformFees),
      pendingRiderSettlements: roundMoney(
        riderEntries.filter((entry) => !entry.settled).reduce((total, entry) => total + entry.earnings, 0),
      ),
      pendingMerchantSettlements: roundMoney(
        merchants.filter((entry) => !entry.settled).reduce((total, entry) => total + entry.earnings, 0),
      ),
    },
    merchants,
    riders: riderEntries,
  });
});

export const recordSettlement = TryCatch(async (req: AdminRequest, res: Response) => {
  const { entityType, entityId, periodStart, reference } = req.body as {
    entityType?: unknown;
    entityId?: unknown;
    periodStart?: unknown;
    reference?: unknown;
  };
  if (
    (entityType !== "merchant" && entityType !== "rider") ||
    typeof entityId !== "string" ||
    !mongoose.isValidObjectId(entityId) ||
    typeof periodStart !== "string" ||
    typeof reference !== "string" ||
    reference.trim().length < 4 ||
    reference.trim().length > 100
  ) {
    return res.status(400).json({
      message: "A valid payee, earning window, and transfer reference are required",
    });
  }

  const start = new Date(periodStart);
  if (!Number.isFinite(start.getTime()) || !isValidWindowStart(start)) {
    return res.status(400).json({ message: "Choose a valid 10:40 PM India-time earning window" });
  }
  const { end } = getWindowFromStart(start);
  if (end.getTime() > Date.now()) {
    return res.status(409).json({ message: "This earning window has not closed yet" });
  }

  const existing = await Settlement.findOne({
    entityType,
    entityId,
    periodStart: start,
    periodEnd: end,
  }).lean();
  if (existing) {
    return res.status(409).json({ message: "This earning has already been settled" });
  }

  let amount = 0;
  let payoutProfile: { accountNumber?: string; ifscCode?: string; upiId?: string; upiQrCode?: string } | null = null;
  if (entityType === "merchant") {
    const business = await Business.findById(entityId).lean();
    if (!business) return res.status(404).json({ message: "Merchant business not found" });
    payoutProfile = business;
    const [summary] = await Order.aggregate<{ grossSales: number }>([
      {
        $match: {
          businessId: entityId,
          paymentStatus: "paid",
          status: "delivered",
          deliveredAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, grossSales: { $sum: "$subtotal" } } },
    ]);
    const grossSales = roundMoney(summary?.grossSales ?? 0);
    amount = roundMoney(grossSales - roundMoney(grossSales * MERCHANT_COMMISSION_RATE));
  } else {
    const rider = await Rider.findOne({ userId: entityId }).lean();
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });
    payoutProfile = rider;
    const [summary] = await Order.aggregate<{ earnings: number }>([
      {
        $match: {
          riderUserId: entityId,
          paymentStatus: "paid",
          status: "delivered",
          deliveredAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, earnings: { $sum: "$deliveryFee" } } },
    ]);
    amount = roundMoney(summary?.earnings ?? 0);
  }

  if (!payoutProfile || !hasPayoutDetails(payoutProfile)) {
    return res.status(409).json({ message: "Payee payout details are missing" });
  }
  if (amount <= 0) {
    return res.status(409).json({ message: "There are no eligible earnings to settle" });
  }
  if (!req.user) {
    return res.status(401).json({ message: "Admin authentication required" });
  }

  try {
    const settlement = await Settlement.create({
      entityType,
      entityId,
      periodStart: start,
      periodEnd: end,
      amount,
      reference: reference.trim(),
      settledBy: req.user.email,
      settledAt: new Date(),
    });
    return res.status(201).json({
      message: "Settlement recorded",
      settlement: {
        entityType: settlement.entityType,
        entityId: settlement.entityId,
        amount: settlement.amount,
        reference: settlement.reference,
        settledAt: settlement.settledAt,
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return res.status(409).json({ message: "This earning has already been settled" });
    }
    throw error;
  }
});

import type { Request, Response } from "express";
import mongoose from "mongoose";
import TryCatch from "../middlewares/trycatch.js";
import { Business, Order, Rider, User } from "../models/entities.js";

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

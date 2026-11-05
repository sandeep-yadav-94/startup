import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../model/Rider.js";

interface CurrentRiderOrder {
  _id: string;
  userId: string;
  riderUserId?: string | null;
}

const riderTypes = ["bike", "bicycle", "walking"] as const;
type RiderType = (typeof riderTypes)[number];

const isRiderType = (value: unknown): value is RiderType =>
  riderTypes.some((riderType) => riderType === value);

const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  const fileBuffer = getBuffer(file);
  if (!fileBuffer?.content) {
    throw new Error("Failed to generate image buffer");
  }

  const { data } = await axios.post<{ url?: unknown }>(
    `${process.env.UTILS_SERVICE}/api/upload`,
    { buffer: fileBuffer.content },
  );
  if (typeof data?.url !== "string" || !data.url) {
    throw new Error("Image upload service did not return an image URL");
  }
  return data.url;
};

const getCurrentOrderForRider = async (riderId: string) => {
  const { data } = await axios.get<{ order: CurrentRiderOrder | null }>(
    `${process.env.BUSINESS_SERVICE}/api/order/current/rider`,
    {
      params: { riderId },
      headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
    },
  );
  return data.order ?? null;
};

export const publishRiderLocation = TryCatch(async (req: AuthenticatedRequest, res) => {
  const riderUser = req.user;
  const { orderId } = req.params;
  const { latitude, longitude } = req.body;

  if (!riderUser || riderUser.role !== "rider") {
    return res.status(403).json({ message: "Only riders can share their location" });
  }

  if (
    typeof orderId !== "string" ||
    !/^[0-9a-fA-F]{24}$/.test(orderId) ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({ message: "A valid order and location are required" });
  }

  const rider = await Rider.findOne({ userId: riderUser._id });
  if (!rider) {
    return res.status(404).json({ message: "Rider profile not found" });
  }

  const currentOrder = await getCurrentOrderForRider(rider._id.toString());
  if (
    !currentOrder ||
    currentOrder._id !== orderId ||
    currentOrder.riderUserId !== riderUser._id
  ) {
    return res.status(403).json({ message: "This order is not assigned to you" });
  }

  rider.location = {
    type: "Point",
    coordinates: [longitude, latitude],
  };
  rider.lastActiveAt = new Date();
  await rider.save();

  try {
    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "rider:location",
        room: currentOrder.userId,
        payload: { orderId, latitude, longitude },
      },
      {
        headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
      },
    );
    return res.json({ message: "Rider location shared" });
  } catch (error) {
    console.error("Failed to broadcast rider location:", error);
    return res.status(502).json({ message: "Could not share rider location" });
  }
});

export const updateRiderLocation = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  const { latitude, longitude } = req.body;

  if (!user || user.role !== "rider") {
    return res.status(403).json({ message: "Only riders can update their location" });
  }

  if (
    (typeof latitude !== "number" && typeof latitude !== "string") ||
    (typeof longitude !== "number" && typeof longitude !== "string") ||
    String(latitude).trim() === "" ||
    String(longitude).trim() === ""
  ) {
    return res.status(400).json({ message: "Please provide a valid rider location" });
  }
  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);
  if (
    !Number.isFinite(latitudeNumber) ||
    latitudeNumber < -90 ||
    latitudeNumber > 90 ||
    !Number.isFinite(longitudeNumber) ||
    longitudeNumber < -180 ||
    longitudeNumber > 180
  ) {
    return res.status(400).json({ message: "Please provide a valid rider location" });
  }

  const rider = await Rider.findOneAndUpdate(
    {
      userId: user._id,
      isAvailble: true,
      isBusy: { $ne: true },
      isVerified: true,
    },
    {
      $set: {
        location: {
          type: "Point",
          coordinates: [longitudeNumber, latitudeNumber],
        },
        lastActiveAt: new Date(),
      },
    },
    { new: true },
  );
  if (!rider) {
    return res.status(409).json({ message: "Rider is not available for location updates" });
  }

  return res.json({ message: "Rider location updated" });
});

export const addRiderProfile = TryCatch(async(req:AuthenticatedRequest, res) => {

  const user = req.user;
  if(!user){
    return res.status(401).json({
      message:"Unauthorized",
    })
  }

  if(user.role !== "rider"){
    return res.status(403).json({
      message: "only riders can create rider profile",
    })
  }

  const {
    phoneNumber,
    addharNumber,
    riderType,
    drivingLicenseNumber,
    accountNumber,
    ifscCode,
    upiId,
    latitude,
    longitude,
  } = req.body as Record<string, unknown>;
  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);
  if (
    typeof phoneNumber !== "string" ||
    !phoneNumber.trim() ||
    typeof addharNumber !== "string" ||
    !addharNumber.trim() ||
    !isRiderType(riderType) ||
    (riderType === "bike" &&
      (typeof drivingLicenseNumber !== "string" || !drivingLicenseNumber.trim())) ||
    typeof accountNumber !== "string" ||
    !accountNumber.trim() ||
    typeof ifscCode !== "string" ||
    !ifscCode.trim() ||
    !Number.isFinite(latitudeNumber) ||
    latitudeNumber < -90 ||
    latitudeNumber > 90 ||
    !Number.isFinite(longitudeNumber) ||
    longitudeNumber < -180 ||
    longitudeNumber > 180
  ) {
    return res.status(400).json({
      message: "Please provide valid rider details and location",
    });
  }

  const uploadedFiles = req.files;
  const getUploadedFile = (fieldName: string): Express.Multer.File | undefined => {
    if (!uploadedFiles || Array.isArray(uploadedFiles)) return undefined;
    return uploadedFiles[fieldName]?.[0];
  };
  const pictureFile = getUploadedFile("file");
  const idProofFrontFile = getUploadedFile("idProofFront");
  const idProofBackFile = getUploadedFile("idProofBack");
  const upiQrCodeFile = getUploadedFile("upiQrCode");
  const normalizedUpiId = typeof upiId === "string" ? upiId.trim() : "";

  if (!pictureFile || !idProofFrontFile || !idProofBackFile) {
    return res.status(400).json({
      message: "Rider photo and both front and back ID proof photos are required",
    });
  }
  if (!normalizedUpiId && !upiQrCodeFile) {
    return res.status(400).json({
      message: "Please provide a UPI ID or upload a UPI QR code",
    });
  }

  const existingRider = await Rider.findOne({
    $or: [
      { userId: user._id.toString() },
      { phoneNumber },
    ],
  });
  if (existingRider) {
    return res.status(409).json({
      message: "Rider profile or phone number already exists",
    });
  }

  let pictureUrl: string;
  let idProofFrontUrl: string;
  let idProofBackUrl: string;
  let upiQrCodeUrl: string | undefined;
  try {
    [pictureUrl, idProofFrontUrl, idProofBackUrl, upiQrCodeUrl] = await Promise.all([
      uploadImage(pictureFile),
      uploadImage(idProofFrontFile),
      uploadImage(idProofBackFile),
      upiQrCodeFile ? uploadImage(upiQrCodeFile) : Promise.resolve(undefined),
    ]);
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || "Image upload service is unavailable"
      : error instanceof Error ? error.message : "Image upload failed";
    return res.status(502).json({ message });
  }

  const rider = await Rider.create({
    userId: user._id,
    picture: pictureUrl,
    riderType,
    phoneNumber: phoneNumber.trim(),
    addharNumber: addharNumber.trim(),
    ...(riderType === "bike" && typeof drivingLicenseNumber === "string"
      ? { drivingLicenseNumber: drivingLicenseNumber.trim() }
      : {}),
    idProofFront: idProofFrontUrl,
    idProofBack: idProofBackUrl,
    accountNumber: accountNumber.trim(),
    ifscCode: ifscCode.trim().toUpperCase(),
    ...(normalizedUpiId ? { upiId: normalizedUpiId } : {}),
    ...(upiQrCodeUrl ? { upiQrCode: upiQrCodeUrl } : {}),
    location: {
      type: "Point",
      coordinates: [longitudeNumber, latitudeNumber],
    },
    isAvailble: false,
    isVerified: false,
  });

  return res.status(201).json({
    message: "Rider profile created successfully",
    rider,
  });

})




export const fetchMyProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can access rider profile",
      });
    }

    const rider = await Rider.findOne({
      userId: user._id.toString(),
    });

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    return res.status(200).json({
      message: "Rider profile fetched successfully",
      rider,
    });
  }
);




export const toggleRiderAvailability = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can change availability",
      });
    }

    const {isAvailble, latitude, longitude} = req.body;

    if(typeof isAvailble !== "boolean"){
      return res.status(400).json({
        message: "isAvailble must be boolean",
      })
    }

    if(latitude === undefined || longitude === undefined){
      return res.status(400).json({
        message: "location is required",
      })
    }

    const rider = await Rider.findOne({
      userId: user._id,
    });
    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    if(isAvailble && !rider.isVerified){
      return res.status(403).json({
        message: "Rider is not verified by admin",
      })
    }

    if (
      (typeof latitude !== "number" && typeof latitude !== "string") ||
      (typeof longitude !== "number" && typeof longitude !== "string") ||
      String(latitude).trim() === "" ||
      String(longitude).trim() === ""
    ) {
      return res.status(400).json({
        message: "Please provide a valid rider location",
      });
    }

    const latitudeNumber = Number(latitude);
    const longitudeNumber = Number(longitude);
    if (
      !Number.isFinite(latitudeNumber) ||
      latitudeNumber < -90 ||
      latitudeNumber > 90 ||
      !Number.isFinite(longitudeNumber) ||
      longitudeNumber < -180 ||
      longitudeNumber > 180
    ) {
      return res.status(400).json({
        message: "Please provide a valid rider location",
      });
    }

    if (isAvailble) {
      try {
        if (await getCurrentOrderForRider(rider._id.toString())) {
          return res.status(409).json({
            message: "Complete your current order before going online",
          });
        }
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message || "Could not verify current rider orders"
          : "Could not verify current rider orders";
        console.error("Failed to check active orders before rider availability update:", error);
        return res.status(502).json({ message });
      }
    }

    rider.isAvailble = isAvailble;
    
    rider.location = {
      type : "Point",
      coordinates : [longitudeNumber, latitudeNumber]
    }

    rider.lastActiveAt = new Date();

    await rider.save();

    if (isAvailble) {
      try {
        if (await getCurrentOrderForRider(rider._id.toString())) {
          await Rider.updateOne(
            { _id: rider._id, isAvailble: true, isBusy: { $ne: true } },
            { $set: { isAvailble: false } },
          );
          return res.status(409).json({
            message: "An order was assigned while you were going online",
          });
        }
      } catch (error) {
        await Rider.updateOne(
          { _id: rider._id, isAvailble: true, isBusy: { $ne: true } },
          { $set: { isAvailble: false } },
        );
        console.error("Could not verify active orders after rider availability update:", error);
        return res.status(502).json({
          message: "Could not verify current orders. Rider has been kept offline.",
        });
      }
    }

    res.json({
      message : isAvailble ? "Rider is now online" : "Rider is now offline",
      rider,
    })

  }
);




export const acceptOrder = TryCatch(async(req:AuthenticatedRequest, res) => {

  const riderUser = req.user;
  const riderUserId = riderUser?._id;
  const {orderId} = req.params;
  if (typeof orderId !== "string" || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
    return res.status(400).json({ message: "A valid order id is required" });
  }
  if(!riderUserId){
    return res.status(400).json({
      message : "Please login",
    })
  }
  if (riderUser.role !== "rider") {
    return res.status(403).json({ message: "Only riders can accept orders" });
  }

  const rider = await Rider.findOneAndUpdate(
    {
      userId: riderUserId,
      isAvailble: true,
      isVerified: true,
      isBusy: { $ne: true },
    },
    { $set: { isBusy: true } },
    { new: true },
  );
  if(!rider){
    return res.status(409).json({
      message: "Rider is offline, unverified, or already accepting an order",
    })
  }

  try {
    const {data} = await axios.put(`${process.env.BUSINESS_SERVICE}/api/order/assign/rider`, {
      orderId, 
      riderId : rider._id.toString(),
      riderUserId : rider.userId,
      riderName : riderUser.name,
      riderPhone : rider.phoneNumber,
    }, {
      headers : {
        "x-internal-key":process.env.INTERNAL_SERVICE_KEY,
      }
    })
    return res.json({ message: "Order accepted", order: data.order });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      try {
        if (!(await getCurrentOrderForRider(rider._id.toString()))) {
          await Rider.updateOne(
            { _id: rider._id, isBusy: true },
            { $set: { isBusy: false } },
          );
        }
      } catch (availabilityError) {
        console.error("Could not verify rider availability after order rejection:", availabilityError);
      }
      const message = error.response.data?.message;
      return res.status(error.response.status).json({
        message: typeof message === "string" ? message : "Order could not be accepted",
      });
    }

    console.error("Order acceptance could not be confirmed:", error);
    try {
      if (!(await getCurrentOrderForRider(rider._id.toString()))) {
        await Rider.updateOne(
          { _id: rider._id, isBusy: true },
          { $set: { isBusy: false } },
        );
      }
    } catch (availabilityError) {
      console.error("Could not verify rider availability after uncertain order acceptance:", availabilityError);
    }
    return res.status(502).json({
      message: "Could not confirm order acceptance. Refresh your current order before trying again.",
    });
  }

})



 export const fetchMyCurrentOrder = TryCatch(async(req:AuthenticatedRequest, res) => {

  const riderUserId = req.user?._id;
   if(!riderUserId){
    return res.status(400).json({
      message : "Please login",
    })
  }

  if (req.user?.role !== "rider") {
    return res.status(403).json({ message: "Only riders can view current orders" });
  }

  const rider = await Rider.findOne({userId : riderUserId});
  if(!rider){
    return res.status(404).json({
      message: "rider not found",
    })
  }

  try {
    res.json({
      order : await getCurrentOrderForRider(rider._id.toString()),
    })
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || "Could not fetch current order"
      : "Could not fetch current order";
    console.error("Failed to fetch current rider order:", error);
    res.status(502).json({ message });
  }

 })




 export const updateOrderStatus = TryCatch(async(req:AuthenticatedRequest, res)=> {

  const userId = req.user?._id;
  if(!userId){
    return res.status(404).json({
      message: "Please login",
    })
  }

  if (req.user?.role !== "rider") {
    return res.status(403).json({ message: "Only riders can update delivery status" });
  }

  const rider = await Rider.findOne({userId : userId})
  if(!rider){
    return res.status(404).json({
      message: "Please login",
    })
  }

  const {orderId} = req.params;
  if (typeof orderId !== "string" || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
    return res.status(400).json({ message: "A valid order id is required" });
  }
  const { expectedStatus } = req.body as { expectedStatus?: unknown };
  if (!["rider_assigned", "reached", "picked_up"].includes(String(expectedStatus))) {
    return res.status(400).json({ message: "A valid current order status is required" });
  }

  try {
    const {data} = await axios.put(`${process.env.BUSINESS_SERVICE}/api/order/update/status/rider`, {
      orderId,
      riderId: rider._id.toString(),
      expectedStatus,
    }, {
      headers : {
        "x-internal-key" : process.env.INTERNAL_SERVICE_KEY,
      }
    })
    if (data.order?.status === "delivered") {
      try {
        await Rider.updateOne(
          { _id: rider._id, isBusy: true },
          { $set: { isBusy: false } },
        );
      } catch (error) {
        console.error("Delivery completed but rider busy status could not be cleared:", error);
        return res.status(502).json({
          message: "Delivery completed, but availability could not be refreshed. Please refresh your dashboard.",
        });
      }
    }
    res.json({
      message: data.message,
      order: data.order,
    })
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || "Could not update order status"
      : "Could not update order status";
    console.error("Failed to update order status:", error);
    res.status(axios.isAxiosError(error) ? error.response?.status ?? 502 : 502).json({ message });
  }

 })

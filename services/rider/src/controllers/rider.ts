import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../model/Rider.js";

const getCurrentOrderForRider = async (riderId: string) => {
  const { data } = await axios.get<{ order: unknown | null }>(
    `${process.env.BUSINESS_SERVICE}/api/order/current/rider`,
    {
      params: { riderId },
      headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
    },
  );
  return data.order ?? null;
};

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

  const {phoneNumber, addharNumber, drivingLicenseNumber, latitude, longitude} = req.body;
  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);
  if (
    !phoneNumber ||
    !addharNumber ||
    !drivingLicenseNumber ||
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

  const file = req.file;
  if(!file){
    return res.status(400).json({
      message: "Rider image is required",
    })
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

  const fileBuffer = getBuffer(file);
  if(!fileBuffer?.content){
    return res.status(500).json({
      message: "Failed to generate image buffer",
    })
  }

  let imageUrl: unknown;
  try {
    const { data } = await axios.post<{ url?: unknown }>(
      `${process.env.UTILS_SERVICE}/api/upload`,
      { buffer: fileBuffer.content },
    );
    imageUrl = data?.url;
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || "Image upload service is unavailable"
      : "Image upload failed";
    return res.status(502).json({ message });
  }

  if (typeof imageUrl !== "string" || !imageUrl) {
    return res.status(502).json({
      message: "Image upload service did not return an image URL",
    });
  }

  const rider = await Rider.create({
    userId: user._id,
    picture: imageUrl,
    phoneNumber,
    addharNumber,
    drivingLicenseNumber,
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
            { _id: rider._id, isAvailble: true },
            { $set: { isAvailble: false } },
          );
          return res.status(409).json({
            message: "An order was assigned while you were going online",
          });
        }
      } catch (error) {
        await Rider.updateOne(
          { _id: rider._id, isAvailble: true },
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
  if(!riderUserId){
    return res.status(400).json({
      message : "Please login",
    })
  }
  if (riderUser.role !== "rider") {
    return res.status(403).json({ message: "Only riders can accept orders" });
  }

  const rider = await Rider.findOneAndUpdate(
    { userId: riderUserId, isAvailble: true, isVerified: true },
    { $set: { isAvailble: false } },
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
            { _id: rider._id, isAvailble: false },
            { $set: { isAvailble: true } },
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

  try {
    const {data} = await axios.put(`${process.env.BUSINESS_SERVICE}/api/order/update/status/rider`, {
      orderId,
      riderId: rider._id.toString(),
    }, {
      headers : {
        "x-internal-key" : process.env.INTERNAL_SERVICE_KEY,
      }
    })
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

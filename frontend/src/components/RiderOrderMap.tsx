import type { IOrder } from "../types";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import axios from "axios";
import { riderService } from "../main";
import { useSocket } from "../context/SocketContext";

type LeafletRoutingApi = {
  control: (options: {
    waypoints: L.LatLng[];
    lineOptions: { styles: Array<{ color: string; weight: number }> };
    addWaypoints: boolean;
    draggableWaypoints: boolean;
    show: boolean;
    createMarker: () => null;
    router: unknown;
  }) => L.Control;
  osrmv1: (options: { serviceUrl: string }) => unknown;
};

const routing = L as typeof L & { Routing: LeafletRoutingApi };

const riderIcon = new L.DivIcon({
  html: '<div style="width:38px;height:38px;display:grid;place-items:center;border:3px solid white;border-radius:50%;background:#557A69;box-shadow:0 4px 14px #26352f55;font-size:19px">🏍️</div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  className: "rider-map-marker",
});

const businessIcon = new L.DivIcon({
  html: '<div style="width:36px;height:36px;display:grid;place-items:center;border:3px solid white;border-radius:50%;background:#AF713C;box-shadow:0 4px 14px #26352f44;font-size:17px">🏪</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: "rider-map-marker",
});

const customerIcon = new L.DivIcon({
  html: '<div style="width:36px;height:36px;display:grid;place-items:center;border:3px solid white;border-radius:50%;background:#54758B;box-shadow:0 4px 14px #26352f44;font-size:17px">📍</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: "rider-map-marker",
});

interface Props {
  order: IOrder;
  viewer?: "rider" | "customer";
}

const Routing = ({ waypoints }: { waypoints: [number, number][] }) => {
  const map = useMap();
  const routeWaypoints = useMemo(
    () => waypoints.map(([latitude, longitude]) => L.latLng(latitude, longitude)),
    [waypoints],
  );

  useEffect(() => {
    const control = routing.Routing.control({
      waypoints: routeWaypoints,
      lineOptions: {
        styles: [{ color: "#557A69", weight: 5 }],
      },
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      createMarker: () => null,
      router: routing.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
    }).addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, routeWaypoints]);

  return null;
};

const FitRouteBounds = ({ locations }: { locations: [number, number][] }) => {
  const map = useMap();
  const bounds = useMemo(() => L.latLngBounds(locations), [locations]);

  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);

  return null;
};

const isValidCoordinate = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  Number.isFinite(longitude) &&
  longitude >= -180 &&
  longitude <= 180;

const RiderOrderMap = ({ order, viewer = "rider" }: Props) => {
  const { socket } = useSocket();
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const customerLocation = useMemo<[number, number] | null>(() => {
    const latitude = order.deliveryAddress?.latitude;
    const longitude = order.deliveryAddress?.longitude;
    return typeof latitude === "number" &&
      typeof longitude === "number" &&
      isValidCoordinate(latitude, longitude)
      ? [latitude, longitude]
      : null;
  }, [order.deliveryAddress?.latitude, order.deliveryAddress?.longitude]);
  const businessLocation = useMemo<[number, number] | null>(() => {
    const location = order.businessLocation;
    if (
      !location ||
      !isValidCoordinate(location.latitude, location.longitude)
    ) {
      return null;
    }

    return [location.latitude, location.longitude];
  }, [order.businessLocation]);

  useEffect(() => {
    if (viewer !== "rider") return;

    const publishLocation = (latitude: number, longitude: number) => {
      setRiderLocation([latitude, longitude]);
      void axios.post(
        `${riderService}/api/rider/order/${order._id}/location`,
        { latitude, longitude },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      ).catch((error: unknown) => {
        console.error("Failed to publish rider location:", error);
        setLocationError("Could not share your live location with the customer.");
      });
    };

    const requestLocation = () => {
      if (!navigator.geolocation) {
        setLocationError("Location access is not supported by this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!isValidCoordinate(coords.latitude, coords.longitude)) {
            setLocationError("Your browser returned an invalid location.");
            return;
          }
          setLocationError(null);
          publishLocation(coords.latitude, coords.longitude);
        },
        (error) => {
          console.error("Could not get rider location:", error);
          setLocationError("Allow location access to share your live location.");
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    };

    requestLocation();
    const interval = setInterval(requestLocation, 10000);
    return () => clearInterval(interval);
  }, [order._id, order.userId, viewer]);

  useEffect(() => {
    if (viewer !== "customer" || !socket) return;

    const onRiderLocation = (location: {
      orderId?: string;
      latitude: number;
      longitude: number;
    }) => {
      if (
        location.orderId !== order._id ||
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude)
      ) {
        return;
      }

      setRiderLocation([location.latitude, location.longitude]);
    };

    socket.on("rider:location", onRiderLocation);
    return () => {
      socket.off("rider:location", onRiderLocation);
    };
  }, [order._id, socket, viewer]);

  const activeDestination =
    viewer === "customer"
      ? customerLocation
      : order.status === "picked_up"
        ? customerLocation
        : ["rider_assigned", "reached"].includes(order.status)
          ? businessLocation
          : null;
  const routeWaypoints = useMemo(
    () => (riderLocation && activeDestination ? [riderLocation, activeDestination] : []),
    [activeDestination, riderLocation],
  );
  if (
    viewer === "rider" &&
    !["rider_assigned", "reached", "picked_up"].includes(order.status)
  ) {
    return (
      <p className="rounded-2xl border border-[#E3E9E2] bg-white p-5 text-sm text-[#66736B]">
        There is no active delivery navigation route.
      </p>
    );
  }
  if (!activeDestination && viewer === "rider") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        {order.status === "picked_up"
          ? "Customer location is unavailable, so the delivery route cannot be shown."
          : "Business location is unavailable, so the pickup route cannot be shown."}
      </p>
    );
  }
  if (viewer === "customer" && !customerLocation) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Customer location is unavailable, so the delivery route cannot be shown.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[#E3E9E2] bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-[#EDF0EC] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#91A097]">Live navigation</p>
          <h3 className="mt-1 font-semibold text-[#34443A]">
            {viewer === "customer"
              ? "Rider location"
              : order.status === "picked_up"
                ? "Your route to the customer"
                : "Your route to the pickup"}
          </h3>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#EDF4EE] px-3 py-1.5 text-xs font-semibold text-[#557A69] sm:self-auto">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6FA27B]" />
          {riderLocation ? "Location sharing live" : "Connecting"}
        </span>
      </div>
      {!riderLocation ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F5F0] text-xl text-[#64816F]">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#D7E3D8] border-t-[#557A69]" />
          </span>
          <p className="mt-4 text-sm font-semibold text-[#46574D]">Connecting to live location</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[#8A968E]">
            {viewer === "customer"
              ? "Waiting for the rider’s live location..."
              : "Allow location access to share your position and see the route."}
          </p>
        </div>
      ) : (
        <MapContainer center={riderLocation} zoom={14} className="h-[360px] w-full sm:h-[440px]">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={riderLocation} icon={riderIcon}>
            <Popup>Rider’s current location</Popup>
          </Marker>
          {activeDestination && (viewer === "customer" || order.status === "picked_up") && (
            <Marker position={activeDestination} icon={customerIcon}>
              <Popup>Customer location · {order.customerName || "Customer"}</Popup>
            </Marker>
          )}
          {activeDestination && viewer === "rider" && order.status !== "picked_up" && (
            <Marker position={activeDestination} icon={businessIcon}>
              <Popup>Business · {order.businessName}</Popup>
            </Marker>
          )}
          {viewer === "customer" && businessLocation && (
            <Marker position={businessLocation} icon={businessIcon}>
              <Popup>Business · {order.businessName}</Popup>
            </Marker>
          )}
          {routeWaypoints.length > 1 && (
            <>
              <FitRouteBounds locations={routeWaypoints} />
              <Routing waypoints={routeWaypoints} />
            </>
          )}
        </MapContainer>
      )}
      {viewer === "rider" && locationError && (
        <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5">
          {locationError}
        </p>
      )}
    </section>
  );
};

export default RiderOrderMap;

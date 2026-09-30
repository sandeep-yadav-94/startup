import { createContext, useContext, useEffect, useState,  type ReactNode } from "react";
import { authService, businessService } from "../config";
import axios from "axios";
import { type ICart, type AppContextType, type Location, type User } from "../types";

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children:ReactNode;
}

const requestLocation = (
    setLocation: AppContextType["setLocation"],
    setCity: AppContextType["setCity"],
    setLoadingLocation: AppContextType["setLoadingLocation"],
): Promise<Location | null> => {
    if (!navigator.geolocation) {
        setCity("Location unavailable");
        return Promise.resolve(null);
    }

    setLoadingLocation(true);
    return new Promise((resolve) => navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`,
                { headers: { Accept: "application/json" } },
            );

            if (!response.ok) {
                throw new Error(`Reverse geocoding failed: ${response.status}`);
            }

            const data: {
                display_name?: string;
                address?: {
                    city?: string;
                    municipality?: string;
                    town?: string;
                    state_district?: string;
                    county?: string;
                };
            } = await response.json();

            const nextLocation = {
                latitude,
                longitude,
                formattedAddress: data.display_name || "Current location",
            };
            setLocation(nextLocation);

            const address = data.address ?? {};
            setCity(
                address.city ||
                address.municipality ||
                address.town ||
                address.state_district ||
                address.county ||
                "Your Location",
            );
            resolve(nextLocation);
        } catch (error) {
            console.error("Location reverse geocoding error:", error);
            setLocation({ latitude, longitude, formattedAddress: "Current Location" });
            setCity("Your Location");
            resolve(null);
        } finally {
            setLoadingLocation(false);
        }
    }, (error) => {
        console.error("Browser geolocation error:", error);
        setLoadingLocation(false);
        setCity(error.code === error.PERMISSION_DENIED ? "Location permission needed" : "Location unavailable");
        resolve(null);
    }, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
    }));
};

export const AppProvider = ({ children }:AppProviderProps) => {

    const [user, setUser] = useState<User | null>(null);
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);

    const [location, setLocation] = useState<Location | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [city, setCity] = useState("fetching location...");

    async function fetchUser() {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await axios.get(`${authService}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUser(data);
            setIsAuth(true);
        } catch (error) {
            console.error("Error fetching user:", error);
            setUser(null);
            setIsAuth(false);
        } finally {
            setLoading(false);
        }
    }


    const [cart, setCart] = useState<ICart[]>([]);
    const [subTotal, setSubTotal] = useState(0);
    const [quantity, setQuantity] = useState(0);

    async function fetchCart() {
        if(!user || user.role !== "customer") return;
        try {
            const {data} = await axios.get(`${businessService}/api/cart/all`, {
                headers:{
                    Authorization:`Bearer ${localStorage.getItem("token")}`
                },
            })
            setCart(data.cart || []);
            setSubTotal(data.subtotal || 0);
            setQuantity(data.cartLength);
        } catch (error) {
            console.log(error);
        }
    }



    useEffect(() => {
        fetchUser();
    }, []);


    useEffect(()=>{
        if(user && user?.role === "customer"){
            fetchCart();
        }
    }, [user]);


    const refreshLocation = () => requestLocation(setLocation, setCity, setLoadingLocation);

    useEffect(() => {
        requestLocation(setLocation, setCity, setLoadingLocation);
    }, []);

    return <AppContext.Provider value={{ user, isAuth, loading, setUser, setIsAuth, setLoading, location, setLocation, loadingLocation, setLoadingLocation, city, setCity, refreshLocation, cart, fetchCart, quantity, subTotal }}>
        {children}
    </AppContext.Provider>
}


export const useAppData = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppData must be used within an AppProvider");
    }
    return context;
};
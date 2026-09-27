export interface User {
  _id: string;
  name: string;
  email: string;
  image: string;
  role: string | null;
}

export interface Location {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface AppContextType {
  user: User | null;
  isAuth: boolean;
  loading: boolean;
  location: Location | null;
  setLocation: (location: Location | null) => void;
  loadingLocation: boolean;
  setLoadingLocation: (loading: boolean) => void;
  city: string;
  setCity: (city: string) => void;
  refreshLocation: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface IBusiness{
   _id:string;
    name : string;
    description?:string;
    image:string;
    ownerId:string;
    phone:number;
    isVerified:boolean;

    autoLocation:{
        type: "Point",
        coordinates: [number, number];
        formattedAddress:string;
    }
    isOpen:boolean;
    createdAt:Date;
}
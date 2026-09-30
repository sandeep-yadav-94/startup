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
  refreshLocation: () => Promise<Location | null>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  cart : ICart[] | null;
  fetchCart: ()=>Promise<void>;
  subTotal: number;
  quantity: number;
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


export interface IServiceList {
    _id: string;
    businessId : string;
    name : string;
    description : string;
    image : string;
    price : number;
    isAvailable : boolean;
    createdAt : Date;
    updatedAt : Date;
}

export interface ICart {
    userId: string;
    businessId:string | IBusiness;
    serviceId:string | IServiceList;
    quantity:number;
    createdAt:Date;
    updatedAt:Date;
}
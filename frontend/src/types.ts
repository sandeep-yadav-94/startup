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
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
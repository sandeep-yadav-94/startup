import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { Toaster } from "react-hot-toast";
import PublicRoute from "./components/publicRoute";
import ProtectedRoute from "./components/protectedRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Business from "./pages/business";
import BusinessDetails from "./pages/BusinessDetails";
import Cart from "./pages/Cart";

const App = () => {

  const {user} = useAppData();

  if(user && user.role === "merchant"){
    return (
      <>
        <Business />
        <Toaster />
      </>
    );
  }

  return (
    <>
      {/* use protected routes and public routes */}
      <BrowserRouter>
      <Navbar/>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/select-role" element={<SelectRole/>} />
            <Route path="/account" element={<Account/>} />
            <Route path="/business/:id" element={<BusinessDetails />} />
            <Route path="/cart" element={<Cart />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </>
  );
};

export default App;
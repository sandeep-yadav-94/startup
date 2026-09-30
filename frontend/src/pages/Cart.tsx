import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FiMinus, FiPlus, FiTrash2, FiShoppingCart } from "react-icons/fi";
import toast from "react-hot-toast";
import { businessService } from "../config";
import { useAppData } from "../context/AppContext";
import type { IBusiness, IServiceList } from "../types";

const Cart = () => {
  const { user, cart, fetchCart, subTotal, quantity } = useAppData();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const updateQuantity = async (serviceId: string, action: "inc" | "dec") => {
    if (!serviceId) return;

    setUpdatingId(serviceId);
    try {
      const { data } = await axios.put(
        `${businessService}/api/cart/${action}`,
        { serviceId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success(data.message);
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to update cart");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    try {
      const { data } = await axios.delete(`${businessService}/api/cart/clear`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success(data.message);
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to clear cart");
    }
  };

  if (!user || user.role !== "customer") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-lg font-medium text-gray-700">Please log in as a customer to view your cart.</p>
        <Link to="/login" className="mt-4 inline-block text-sm text-red-500 hover:underline">
          Go to login
        </Link>
      </main>
    );
  }

  if (!cart || cart.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <FiShoppingCart className="mx-auto h-10 w-10 text-gray-400" />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Your cart is empty</h1>
          <p className="mt-2 text-gray-500">Pick a suitable service and add it here for the people you need.</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600">
            Explore businesses
          </Link>
        </div>
      </main>
    );
  }

  const checkOut = () => {
    if (!cart || cart.length === 0) return;

    const business = (cart[0]?.businessId as IBusiness | undefined);
    if (business && !business.isOpen) {
      return;
    }

    navigate("/checkout");
  };

  const isBusinessClosed = !!(cart && cart.length > 0 && (cart[0]?.businessId as IBusiness | undefined)?.isOpen === false);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Your selection</p>
          <h1 className="text-2xl font-semibold text-gray-900">Cart</h1>
        </div>
        <button
          onClick={handleClearCart}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-red-200 hover:text-red-500"
        >
          <FiTrash2 size={16} /> Clear cart
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
        <section className="space-y-4">
          {cart.map((item) => {
            const service = item.serviceId as IServiceList | undefined;
            const business = item.businessId as IBusiness | undefined;

            if (!service || !business) return null;

            const lineTotal = service.price * item.quantity;

            return (
              <div key={String(service._id)} className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row">
                <img src={service.image} alt={service.name} className="h-24 w-24 rounded-xl object-cover" />

                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-500">{business.name}</p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">{service.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                  <p className="mt-2 text-sm font-medium text-gray-700">₹{service.price} / person</p>
                </div>

                <div className="flex flex-col justify-between gap-3 md:items-end">
                  <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-2 py-1">
                    <button
                      onClick={() => updateQuantity(service._id, "dec")}
                      disabled={updatingId === service._id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiMinus size={15} />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(service._id, "inc")}
                      disabled={updatingId === service._id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiPlus size={15} />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">₹{lineTotal}</p>
                    <p className="text-xs text-gray-500">{item.quantity} people</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>

          <div className="mt-5 space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total people</span>
              <span className="font-medium text-gray-900">{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">₹{subTotal}</span>
            </div>
          </div>

          <button
            className={`mt-6 w-full rounded-full px-4 py-3 text-sm font-medium transition ${
              isBusinessClosed
                ? "cursor-not-allowed bg-gray-300 text-gray-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
            onClick={checkOut}
            disabled={isBusinessClosed}
            aria-disabled={isBusinessClosed}
            title={isBusinessClosed ? "Business is closed" : "Proceed to booking"}
          >
            {isBusinessClosed ? "Business is closed" : "Booking"}
          </button>
        </aside>
      </div>
    </main>
  );
};

export default Cart;
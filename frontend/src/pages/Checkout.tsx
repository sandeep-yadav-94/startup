import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { businessService } from "../config";
import { useNavigate } from "react-router-dom";
import type { IBusiness, ICart, IServiceList } from "../types";
import { toast } from "react-hot-toast/headless";
import { utilsService } from "../main";
import { BiCreditCard, BiLoader } from "react-icons/bi";

declare const process: {
  env: Record<string, string | undefined>;
};

interface Address {
 _id: string;
 formattedAddress: string;
 mobile: number;
}

const Checkout = () => {

  const{cart, subTotal, fetchCart} = useAppData();
  const navigate = useNavigate();
  const hasCartItems = (cart?.length ?? 0) > 0;

  const [addresses, setAddresses] = useState<Address[]>([]);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [loadingAddresses, setLoadingAddresses] = useState(true); 

  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      if(!hasCartItems) {
        setLoadingAddresses(false);
        return;
      }
      try {
        const { data } = await axios.get(`${businessService}/api/address/all`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setAddresses(data.addresses);
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [hasCartItems]);



  if(!cart || cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-gray-600">Please add items to your cart before proceeding to checkout.</p>
      </div>
    );
  }

  const business = cart[0].businessId as IBusiness;

  const deliveryFee = subTotal < 250 ? 49 : 0;

  const platformFee = subTotal * 0.05;

  const grandTotal = subTotal + deliveryFee + platformFee;


  const createOrder = async (paymentMethod: "razorpay") => {
    if(!selectedAddressId) {
      alert("Please select an address");
      return;
    }
    setCreatingOrder(true);
    try {
      const {data} = await axios.post(`${businessService}/api/order/new`, {
        paymentMethod,
        addressId: selectedAddressId,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return data;
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(message || "Error creating order. Please try again.");
      console.error('Error creating order:', error);
    } finally {
      setCreatingOrder(false);
    }
  }

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);
      const order = await createOrder("razorpay");
      if(!order) {
        setLoadingRazorpay(false);
        return;
      }
      const {orderId, totalAmount} = order;
      const {data} = await axios.post(`${utilsService}/api/payment/create/${orderId}`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`  
        }
      });
      const {razorpayOrderId, key} = data;
      const options = {
        key,
        amount: Math.round(Number(totalAmount) * 100),
        currency: "INR",
        name: "Sushmap Corp.",
        description: "Service booking Order Payment",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            }, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            await fetchCart();
            toast.success("Payment successful!");
            navigate(`/payment-success/${encodeURIComponent(response.razorpay_payment_id)}`, {
              state: { orderId },
            });
          } catch (error) {
            toast.error("Payment verification failed. Please contact support.");
            console.error('Payment verification error:', error);
          }
        },

       theme: {
        "color":"#E23744"
       },
    };
    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  } catch (error) {
      toast.error("Error creating order. Please try again.");
      console.error('Error creating order:', error);
    } finally {
      setLoadingRazorpay(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{business.name}</h2>
        <p className="text-gray-600">{business.autoLocation.formattedAddress}</p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Delivery Address</h3>
        {
          loadingAddresses ? (
            <p className="text-gray-600">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <p className="text-gray-600">No addresses found. Please add an address in your account settings.</p>
          ) : (
            <ul className="space-y-2">
              {addresses.map((address) => (
                <li key={address._id} className={`p-3 border rounded-lg cursor-pointer ${selectedAddressId === address._id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`} >
                  <input
                    type="radio"
                    id={address._id}
                    name="address"
                    checked={selectedAddressId === address._id}
                    onChange={() => setSelectedAddressId(address._id)}
                  />
                  <div>
                    <p className="text-gray-600">{address.formattedAddress}</p>
                    <p className="text-gray-600">Mobile: {address.mobile}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Order Summary</h3>
        {
          cart.map((cartitem: ICart, index: number) => {
            const item = cartitem.serviceId  as IServiceList;
            return (
              <div key={`${item._id}-${index}`} className="flex justify-between items-center border-b py-2">
                <div>
                  <p className="text-gray-600">{item.name}</p>
                  <p className="text-gray-500 text-sm">Quantity: {cartitem.quantity}</p>
                </div>
                <p className="text-gray-600">₹{item.price * cartitem.quantity}</p>
              </div>
            )
          })  
        }
        <hr/>

        <div className="flex justify-between items-center py-2">
          <p className="text-gray-600">Subtotal</p>
          <p className="text-gray-600">₹{subTotal}</p>
        </div>

        <div className="flex justify-between items-center py-2">
          <p className="text-gray-600">Delivery Fee</p>
          <p className="text-gray-600">{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</p>
        </div>

        <div className="flex justify-between items-center py-2">
          <p className="text-gray-600">Platform Fee (5%)</p>
          <p className="text-gray-600">₹{platformFee.toFixed(2)}</p>
        </div>

        {
          subTotal < 250 && (
            <p className="text-red-500 text-sm">Note: Orders below ₹250 will incur a delivery fee of ₹49.</p>
          )
        }

        <div className="flex justify-between items-center py-2 font-semibold">
          <p className="text-gray-600">Grand Total</p>
          <p className="text-gray-600">₹{grandTotal.toFixed(2)}</p>
        </div>



      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Payment Options</h3>
        <button disabled={!selectedAddressId || loadingRazorpay || creatingOrder} onClick={payWithRazorpay} className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
          {loadingRazorpay ? <BiLoader size={18} className="animate-spin"/> : <BiCreditCard size={18} />} Pay with Razorpay
          </button>
      </div>
    </div>
  )
}

export default Checkout
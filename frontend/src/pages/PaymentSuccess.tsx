import { Link, useLocation, useParams } from "react-router-dom";
import { FiCheck } from "react-icons/fi";

interface PaymentSuccessState {
  orderId?: string;
}

const PaymentSuccess = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const location = useLocation();
  const orderId = (location.state as PaymentSuccessState | null)?.orderId;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-12">
      <section className="w-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <FiCheck size={32} aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-green-600">
          Payment confirmed
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Thank you for your order!</h1>
        <p className="mt-3 text-gray-600">
          Your payment was successful and your booking has been placed.
        </p>

        {(orderId || paymentId) && (
          <dl className="mt-8 space-y-3 rounded-xl bg-gray-50 p-4 text-left text-sm">
            {orderId && (
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="font-medium text-gray-500">Order ID</dt>
                <dd className="break-all text-gray-800">{orderId}</dd>
              </div>
            )}
            {paymentId && (
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="font-medium text-gray-500">Payment ID</dt>
                <dd className="break-all text-gray-800">{paymentId}</dd>
              </div>
            )}
          </dl>
        )}

        <Link
          to="/"
          className="mt-8 inline-flex rounded-full bg-[#E23744] px-6 py-3 font-medium text-white transition hover:bg-[#d32f3a]"
        >
          Continue exploring
        </Link>

        <Link
          to="/orders"
          className="mt-8 inline-flex rounded-full bg-[#E23744] px-6 py-3 font-medium text-white transition hover:bg-[#d32f3a]"
        >
          Your orders
        </Link>

        
      </section>
    </main>
  );
};

export default PaymentSuccess;

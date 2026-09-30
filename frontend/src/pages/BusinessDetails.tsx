import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import ServiceList from "../components/ServiceList";
import { businessService } from "../config";
import type { IBusiness, IServiceList } from "../types";

const BusinessDetails = () => {
  const { id } = useParams();
  const [business, setBusiness] = useState<IBusiness | null>(null);
  const [services, setServices] = useState<IServiceList[]>([]);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchServices = async (businessId: string) => {
    setServicesLoading(true);
    try {
      const { data } = await axios.get<IServiceList[]>(`${businessService}/api/service/all/${businessId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setServices(data || []);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        setError("Business not found");
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get<IBusiness | null>(`${businessService}/api/business/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!data) {
          setError("Business not found");
          return;
        }
        setBusiness(data);
        await fetchServices(data._id);
      } catch {
        setError("Unable to load this business");
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [id]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-gray-500">Loading business...</main>;
  }

  if (error || !business) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-gray-600">{error || "Business not found"}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-red-600 hover:underline">Back to businesses</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {business.image && !imageFailed ? (
        <img
          src={business.image}
          alt={business.name}
          onError={() => setImageFailed(true)}
          className="max-h-128 w-full rounded-xl bg-gray-100 object-cover"
        />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">Image unavailable</div>
      )}
      <section className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900">{business.name}</h1>
        <p className="mt-2 text-sm text-gray-600">{business.autoLocation.formattedAddress}</p>
        {business.description && <p className="mt-4 text-gray-700">{business.description}</p>}
        <p className="mt-3 text-sm text-gray-600">{business.isOpen ? "Open" : "Closed"} · {business.phone}</p>
      </section>

      <section className="mt-6 border-t border-gray-200 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Services</h2>
          <span className="text-sm text-gray-500">{services.length} listed</span>
        </div>

        {servicesLoading ? (
          <p className="text-sm text-gray-500">Loading services...</p>
        ) : services.length > 0 ? (
          <ServiceList Service={services} onServiceDeleted={() => fetchServices(business._id)} isMerchant={false} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No services added for this business yet.
          </div>
        )}
      </section>
    </main>
  );
};

export default BusinessDetails;
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Package, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

const COMMON_CITIES = [
  'New Delhi', 'Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Chennai',
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh',
  'Kochi', 'Patna', 'Guwahati', 'Bhubaneswar'
];

export const CreateResourcePage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    quantityTotal: '',
    unit: '',
    city: user?.ngoProfile?.city || 'New Delhi',
    state: '',
    expiryDate: ''
  });

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data.data || []);
        if (res.data.data?.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: res.data.data[0].id }));
        }
      } catch {
        setError('Failed to fetch resource categories');
      }
    };
    fetchCats();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Get tomorrow's date string YYYY-MM-DD for min date picker constraint
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(formData.quantityTotal, 10);
    if (!qty || qty <= 0) {
      setError('Quantity must be a positive number');
      return;
    }

    if (!formData.categoryId) {
      setError('Please select a valid category');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        quantityTotal: qty,
        unit: formData.unit.trim(),
        city: formData.city.trim(),
        state: formData.state.trim() || undefined,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined
      };

      await api.post('/resources', payload);
      setSuccess(true);
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('my-resources');
        }
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to list resource. Please review your entries.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      {onNavigate && (
        <button
          onClick={() => onNavigate('browse-resources')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Available Donations</span>
        </button>
      )}

      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-10 shadow-sm">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 mb-2">
            <Package className="w-3.5 h-3.5" />
            <span>Resource Listing</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">List a Donation</h1>
          <p className="text-xs text-gray-500 mt-1">
            Publish available goods, medical equipment, or food parcels so verified NGOs can claim and distribute them to communities in need.
          </p>
        </div>

        {success ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Donation Listed Successfully!</h2>
            <p className="text-xs text-gray-500">
              Your listing is now live in the community catalog. Redirecting to your listings...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Item Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. 100 Hygiene Kits & First Aid Supplies"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Description & Specifications <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="description"
                rows="4"
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe contents, packaging condition, storage requirements, or pickup instructions..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs leading-relaxed"
              />
            </div>

            {/* Category & Quantity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  name="categoryId"
                  required
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Total Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantityTotal"
                  required
                  min="1"
                  value={formData.quantityTotal}
                  onChange={handleChange}
                  placeholder="e.g. 50"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Unit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="e.g. boxes, kg, kits"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* Location & Expiry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  list="city-options"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. New Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
                <datalist id="city-options">
                  {COMMON_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  State (Optional)
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Auto-resolved if blank"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  min={tomorrow}
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('browse-resources')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm shadow-emerald-200"
              >
                {loading ? 'Publishing...' : 'Publish Listing'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

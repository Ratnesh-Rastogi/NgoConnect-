import React, { useState } from 'react';
import { api } from '../api/client.js';
import { X, Sparkles, AlertCircle, PlusCircle } from 'lucide-react';

export const RequestModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Healthcare',
    urgency: 'HIGH',
    quantityNeeded: 100,
    unit: 'units',
    location: ''
  });

  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAiDraft = async () => {
    if (!aiTopic.trim()) {
      setError('Please provide a short topic or keyword phrase for the AI generator.');
      return;
    }

    setAiLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/draft', {
        topic: aiTopic,
        category: formData.category,
        urgency: formData.urgency
      });

      const { suggestedTitle, suggestedDescription, suggestedUnit } = res.data.data;
      setFormData((prev) => ({
        ...prev,
        title: suggestedTitle,
        description: suggestedDescription,
        unit: suggestedUnit || prev.unit
      }));
      setShowAiPrompt(false);
    } catch (err) {
      setError(err.message || 'AI request draft failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const parsedQty = parseInt(formData.quantityNeeded, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Quantity needed must be a positive number.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/requests', {
        ...formData,
        quantityNeeded: parsedQty
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to publish resource request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-gray-900 text-base">Create Resource Request</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Drafting Assistant Trigger */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-900">AI Request Draft Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPrompt(!showAiPrompt)}
                className="text-[11px] font-semibold text-purple-700 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-xs hover:bg-purple-100"
              >
                {showAiPrompt ? 'Hide Assistant' : 'Use AI Generator'}
              </button>
            </div>

            {showAiPrompt && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  placeholder="Enter keywords e.g. 'Emergency winter jackets for flood camp'"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiLoading ? 'Drafting...' : 'Generate Title & Description'}</span>
                </button>
              </div>
            )}
          </div>

          <form id="create-request-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Request Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Emergency Antibiotic & First-Aid Supplies"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Healthcare">Healthcare</option>
                  <option value="Food">Food</option>
                  <option value="Shelter">Shelter</option>
                  <option value="Education">Education</option>
                  <option value="Disaster Relief">Disaster Relief</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Urgency Priority *</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity Needed *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantityNeeded}
                  onChange={(e) => setFormData({ ...formData, quantityNeeded: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unit *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. boxes, kits"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  required
                  placeholder="City / District"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Description *</label>
              <textarea
                required
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe how the resources will be used and distribution criteria..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-2 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-request-form"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

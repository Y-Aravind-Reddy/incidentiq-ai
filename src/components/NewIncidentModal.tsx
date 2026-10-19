import React, { useState } from 'react';
import { Severity } from '../agent/types.ts';
import { createIncident } from '../services/api.ts';
import { Plus, X, AlertTriangle } from 'lucide-react';

interface NewIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: () => void;
}

export const NewIncidentModal: React.FC<NewIncidentModalProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('high');
  const [serviceName, setServiceName] = useState('auth-service');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createIncident({
        title,
        description,
        severity,
        service_name: serviceName,
      });
      onIncidentCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#332B20]/55 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#FAF6EE] border border-[#D4C1A1] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#D4C1A1] flex items-center justify-between bg-[#F4EFE5]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#985333]" />
            <h3 className="text-sm font-semibold text-[#332B20]">
              Inject Synthetic Incident into Sandbox
            </h3>
          </div>
          <button onClick={onClose} className="text-[#756B5D] hover:text-[#332B20]">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-[#C74F46]/15 border border-[#C74F46]/40 text-[#A73832] rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[#756B5D] uppercase font-bold mb-1">
              Incident Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Redis Connection Timeout Surge on Session Cache"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F4EFE5] border border-[#D4C1A1] rounded px-3 py-1.5 text-xs text-[#332B20] placeholder-[#756B5D] focus:outline-none focus:border-[#B86B43]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#756B5D] uppercase font-bold mb-1">
                Target Service
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full bg-[#F4EFE5] border border-[#D4C1A1] rounded px-3 py-1.5 text-xs text-[#332B20] focus:outline-none focus:border-[#B86B43]"
              />
            </div>

            <div>
              <label className="block text-[#756B5D] uppercase font-bold mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full bg-[#F4EFE5] border border-[#D4C1A1] rounded px-3 py-1.5 text-xs text-[#332B20] focus:outline-none focus:border-[#B86B43]"
              >
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#756B5D] uppercase font-bold mb-1">
              Description & Symptoms
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe symptoms, error codes, saturation triggers, and customer impact..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#F4EFE5] border border-[#D4C1A1] rounded p-2.5 text-xs text-[#332B20] placeholder-[#756B5D] focus:outline-none focus:border-[#B86B43]"
            />
          </div>

          <div className="pt-3 border-t border-[#D4C1A1] flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#EDE4D4] text-[#655D51] rounded hover:text-[#332B20]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#B86B43] hover:bg-[#985333] text-[#332B20] font-bold rounded flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Injecting...' : 'Inject Incident'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324D]/55 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#FFFFFF] border border-[#E1EAF3] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#E1EAF3] flex items-center justify-between bg-[#F4F8FC]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#1E5E9B]" />
            <h3 className="text-sm font-semibold text-[#17324D]">
              Inject Synthetic Incident into Sandbox
            </h3>
          </div>
          <button onClick={onClose} className="text-[#718096] hover:text-[#17324D]">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-[#D95757]/15 border border-[#D95757]/40 text-[#B33E3E] rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[#718096] uppercase font-bold mb-1">
              Incident Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Redis Connection Timeout Surge on Session Cache"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F4F8FC] border border-[#E1EAF3] rounded px-3 py-1.5 text-xs text-[#17324D] placeholder-[#718096] focus:outline-none focus:border-[#2677C9]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#718096] uppercase font-bold mb-1">
                Target Service
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full bg-[#F4F8FC] border border-[#E1EAF3] rounded px-3 py-1.5 text-xs text-[#17324D] focus:outline-none focus:border-[#2677C9]"
              />
            </div>

            <div>
              <label className="block text-[#718096] uppercase font-bold mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full bg-[#F4F8FC] border border-[#E1EAF3] rounded px-3 py-1.5 text-xs text-[#17324D] focus:outline-none focus:border-[#2677C9]"
              >
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#718096] uppercase font-bold mb-1">
              Description & Symptoms
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe symptoms, error codes, saturation triggers, and customer impact..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#F4F8FC] border border-[#E1EAF3] rounded p-2.5 text-xs text-[#17324D] placeholder-[#718096] focus:outline-none focus:border-[#2677C9]"
            />
          </div>

          <div className="pt-3 border-t border-[#E1EAF3] flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#EAF4FF] text-[#4A6176] rounded hover:text-[#17324D]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#2677C9] hover:bg-[#1E5E9B] text-white font-bold rounded flex items-center space-x-1.5 disabled:opacity-50"
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

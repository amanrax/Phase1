// src/pages/OperatorManagement.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/user.service";

interface Operator {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  region?: string;
}

export default function OperatorManagement() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    region: "",
  });

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers({ role: "OPERATOR" });
      setOperators(data.results || []);
    } catch (error) {
      console.error("Failed to load operators:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.createOperator(formData);
      alert("Operator created successfully!");
      setShowCreateForm(false);
      setFormData({ email: "", password: "", full_name: "", phone: "", region: "" });
      loadOperators();
    } catch (error: any) {
      alert("Failed to create operator: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold">👥 Operator Management</h1>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              aria-expanded={showCreateForm}
              aria-controls="createOperatorForm"
            >
              {showCreateForm ? "Cancel" : "+ Create Operator"}
            </button>
          </div>

          {showCreateForm && (
            <form
              id="createOperatorForm"
              onSubmit={handleCreate}
              className="mb-6 p-4 bg-gray-50 rounded"
              aria-live="polite"
            >
              <h3 className="font-bold mb-4">Create New Operator</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email *"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Full Name *"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Assigned Region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="px-3 py-2 border rounded col-span-2"
                />
              </div>
              <button
                type="submit"
                className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Create Operator
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              Loading operators...
            </div>
          ) : (
            <div className="space-y-3" role="list">
              {operators.map((operator) => (
                <div
                  key={operator.id}
                  className="border rounded p-4 flex justify-between items-center"
                  role="listitem"
                >
                  <div>
                    <h3 className="font-bold">{operator.full_name || operator.email}</h3>
                    <p className="text-sm text-gray-600">Email: {operator.email}</p>
                    <p className="text-sm text-gray-600">
                      Region: {operator.region || "Not assigned"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800" aria-label={`Edit ${operator.full_name || "operator"}`}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-800" aria-label={`Deactivate ${operator.full_name || "operator"}`}>
                      Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

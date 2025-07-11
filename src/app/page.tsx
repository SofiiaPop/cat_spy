'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000';

interface SpyCat {
  id: number;
  name: string;
  years_of_experience: number;
  breed: string;
  salary: number;
}

interface Target {
  id: number;
  mission_id: number;
  name: string;
  country: string;
  notes: string;
  complete: boolean;
}

interface Mission {
  id: number;
  cat_id: number | null;
  complete: boolean;
  targets: Target[];
}

interface FormData {
  name: string;
  years_of_experience: number;
  breed: string;
  salary: number;
}

interface MissionFormData {
  targets: {
    name: string;
    country: string;
    notes: string;
  }[];
}

export default function Home() {
  const [spyCats, setSpyCats] = useState<SpyCat[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [editingCat, setEditingCat] = useState<SpyCat | null>(null);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [activeTab, setActiveTab] = useState<'cats' | 'missions'>('cats');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    years_of_experience: 0,
    breed: '',
    salary: 0,
  });
  const [missionFormData, setMissionFormData] = useState<MissionFormData>({
    targets: [{ name: '', country: '', notes: '' }],
  });

  // Fetch available cat breeds from TheCatAPI
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        const response = await fetch('https://api.thecatapi.com/v1/breeds');
        if (!response.ok) throw new Error('Failed to fetch breeds');
        const data = await response.json();
        setBreeds(data.map((breed: any) => breed.name));
      } catch (err) {
        console.error('Failed to load cat breeds:', err);
        setError('Failed to load cat breeds. You can still enter breeds manually.');
      }
    };
    fetchBreeds();
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchSpyCats();
    fetchMissions();
  }, []);

  const fetchSpyCats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/spy-cats/`);
      if (!response.ok) throw new Error('Failed to fetch spy cats');
      const data = await response.json();
      setSpyCats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch spy cats:', err);
      setError('Failed to fetch spy cats. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/missions/`);
      if (!response.ok) throw new Error('Failed to fetch missions');
      const data = await response.json();
      setMissions(data);
    } catch (err) {
      console.error('Failed to fetch missions:', err);
      setError('Failed to fetch missions.');
    }
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.breed.trim()) {
      setError('Breed is required');
      return;
    }
    if (formData.years_of_experience < 0) {
      setError('Years of experience must be non-negative');
      return;
    }
    if (formData.salary < 0) {
      setError('Salary must be non-negative');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/spy-cats/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add spy cat');
      }

      await fetchSpyCats();
      setShowAddForm(false);
      setFormData({ name: '', years_of_experience: 0, breed: '', salary: 0 });
      setError(null);
    } catch (err: any) {
      console.error('Failed to add spy cat:', err);
      setError(err.message || 'Failed to add spy cat');
    }
  };

  const handleAddMission = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (missionFormData.targets.length === 0) {
      setError('At least one target is required');
      return;
    }

    for (const target of missionFormData.targets) {
      if (!target.name.trim()) {
        setError('All targets must have a name');
        return;
      }
      if (!target.country.trim()) {
        setError('All targets must have a country');
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/missions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create mission');
      }

      await fetchMissions();
      setShowMissionForm(false);
      setMissionFormData({ targets: [{ name: '', country: '', notes: '' }] });
      setError(null);
    } catch (err: any) {
      console.error('Failed to create mission:', err);
      setError(err.message || 'Failed to create mission');
    }
  };

  const handleUpdateSalary = async (catId: number, newSalary: number) => {
    if (newSalary < 0) {
      setError('Salary must be non-negative');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/spy-cats/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary: newSalary }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update salary');
      }

      await fetchSpyCats();
      setEditingCat(null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to update salary:', err);
      setError(err.message || 'Failed to update salary');
    }
  };

  const handleUpdateTarget = async (targetId: number, updates: { notes?: string; complete?: boolean }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/targets/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update target');
      }

      await fetchMissions();
      setEditingTarget(null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to update target:', err);
      setError(err.message || 'Failed to update target');
    }
  };

  const handleAssignMission = async (missionId: number, catId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/missions/${missionId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat_id: catId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to assign mission');
      }

      await fetchMissions();
      setError(null);
    } catch (err: any) {
      console.error('Failed to assign mission:', err);
      setError(err.message || 'Failed to assign mission');
    }
  };

  const handleDeleteCat = async (catId: number) => {
    if (window.confirm('Are you sure you want to delete this spy cat?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/spy-cats/${catId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to delete spy cat');
        }

        await fetchSpyCats();
        setError(null);
      } catch (err: any) {
        console.error('Failed to delete spy cat:', err);
        setError(err.message || 'Failed to delete spy cat');
      }
    }
  };

  const handleDeleteMission = async (missionId: number) => {
    if (window.confirm('Are you sure you want to delete this mission?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/missions/${missionId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to delete mission');
        }

        await fetchMissions();
        setError(null);
      } catch (err: any) {
        console.error('Failed to delete mission:', err);
        setError(err.message || 'Failed to delete mission');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', years_of_experience: 0, breed: '', salary: 0 });
    setShowAddForm(false);
    setEditingCat(null);
    setError(null);
  };

  const resetMissionForm = () => {
    setMissionFormData({ targets: [{ name: '', country: '', notes: '' }] });
    setShowMissionForm(false);
    setError(null);
  };

  const addTarget = () => {
    if (missionFormData.targets.length < 3) {
      setMissionFormData({
        targets: [...missionFormData.targets, { name: '', country: '', notes: '' }],
      });
    }
  };

  const removeTarget = (index: number) => {
    if (missionFormData.targets.length > 1) {
      setMissionFormData({
        targets: missionFormData.targets.filter((_, i) => i !== index),
      });
    }
  };

  const updateTarget = (index: number, field: string, value: string) => {
    setMissionFormData({
      targets: missionFormData.targets.map((target, i) =>
        i === index ? { ...target, [field]: value } : target
      ),
    });
  };

  const getCatName = (catId: number | null) => {
    if (!catId) return 'Unassigned';
    const cat = spyCats.find(c => c.id === catId);
    return cat ? cat.name : 'Unknown Cat';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading spy cats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Spy Cat Agency Management
        </h1>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('cats')}
              className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'cats'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Spy Cats ({spyCats.length})
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'missions'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Missions ({missions.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {activeTab === 'cats' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setError(null);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4"
            >
              {showAddForm ? 'Cancel' : 'Add New Spy Cat'}
            </button>

            {showAddForm && (
              <form onSubmit={handleAddCat} className="bg-gray-50 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold mb-4">Add New Spy Cat</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Years of Experience *
                    </label>
                    <input
                      type="number"
                      value={formData.years_of_experience}
                      onChange={(e) =>
                        setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Breed *
                    </label>
                    {breeds.length > 0 ? (
                      <select
                        value={formData.breed}
                        onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select a breed</option>
                        {breeds.map((breed) => (
                          <option key={breed} value={breed}>
                            {breed}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.breed}
                        onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Siamese, Persian, Maine Coon"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary ($) *
                    </label>
                    <input
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Add Spy Cat
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {spyCats.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No spy cats found. Add your first spy cat to get started!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spyCats.map((cat) => (
                  <div
                    key={cat.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{cat.name}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCat(cat)}
                          className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded"
                          title="Edit salary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCat(cat.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
                          title="Delete cat"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <strong>Breed:</strong> {cat.breed}
                      </p>
                      <p>
                        <strong>Experience:</strong> {cat.years_of_experience} years
                      </p>
                      <p>
                        <strong>Salary:</strong> ${cat.salary.toLocaleString()}
                      </p>
                    </div>

                    {editingCat?.id === cat.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Update Salary
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            defaultValue={cat.salary}
                            min="0"
                            step="0.01"
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setEditingCat((prev) => ({ ...prev!, salary: isNaN(val) ? 0 : val }));
                            }}
                          />
                          <button
                            onClick={() => handleUpdateSalary(cat.id, editingCat.salary)}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCat(null)}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <button
              onClick={() => {
                setShowMissionForm(!showMissionForm);
                setError(null);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4"
            >
              {showMissionForm ? 'Cancel' : 'Create New Mission'}
            </button>

            {showMissionForm && (
              <form onSubmit={handleAddMission} className="bg-gray-50 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold mb-4">Create New Mission</h2>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Targets (1-3 required)</h3>
                  {missionFormData.targets.map((target, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Target {index + 1}</h4>
                        {missionFormData.targets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTarget(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={target.name}
                            onChange={(e) => updateTarget(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country *
                          </label>
                          <input
                            type="text"
                            value={target.country}
                            onChange={(e) => updateTarget(index, 'country', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={target.notes}
                            onChange={(e) => updateTarget(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {missionFormData.targets.length < 3 && (
                    <button
                      type="button"
                      onClick={addTarget}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                    >
                      Add Target
                    </button>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Create Mission
                  </button>
                  <button
                    type="button"
                    onClick={resetMissionForm}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {missions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No missions found
              </p>
            ) : (
              <div className="space-y-4">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Mission #{mission.id}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Status: {mission.complete ? 'Completed' : 'Active'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Assigned to: {getCatName(mission.cat_id)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!mission.cat_id && (
                          <select
                            onChange={(e) => {
                              const catId = parseInt(e.target.value);
                              if (catId) {
                                handleAssignMission(mission.id, catId);
                              }
                            }}
                            className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Assign Cat</option>
                            {spyCats.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => handleDeleteMission(mission.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
                          title="Delete mission"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Targets:</h4>
                      {mission.targets.map((target) => (
                        <div
                          key={target.id}
                          className="border border-gray-100 rounded p-3 bg-gray-50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-medium text-gray-800">{target.name}</h5>
                              <p className="text-sm text-gray-600">{target.country}</p>
                              <p className="text-sm text-gray-600">
                                Status: {target.complete ? 'Completed' : 'Pending'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {!target.complete && !mission.complete && (
                                <>
                                  <button
                                    onClick={() => setEditingTarget(target)}
                                    className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded"
                                    title="Edit target"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleUpdateTarget(target.id, { complete: true })}
                                    className="text-green-500 hover:text-green-700 text-sm px-2 py-1 rounded"
                                    title="Mark as complete"
                                  >
                                    Complete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {target.notes && (
                            <p className="text-sm text-gray-600 italic">
                              <strong>Notes:</strong> {target.notes}
                            </p>
                          )}

                          {editingTarget?.id === target.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Update Target Notes
                              </label>
                              <div className="flex gap-2">
                                <textarea
                                  defaultValue={target.notes}
                                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  rows={2}
                                  onChange={(e) => {
                                    setEditingTarget((prev) => ({ ...prev!, notes: e.target.value }));
                                  }}
                                />
                                <button
                                  onClick={() => handleUpdateTarget(target.id, { notes: editingTarget.notes })}
                                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingTarget(null)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

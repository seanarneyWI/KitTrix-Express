import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';

interface Company {
  id: number;
  companyName: string;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (value: string, companyId?: number) => void;
  required?: boolean;
}

const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value,
  onChange,
  required = false,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch companies based on search term
  useEffect(() => {
    const fetchCompanies = async () => {
      if (value.length < 2) {
        setCompanies([]);
        return;
      }

      setLoading(true);
      try {
        const url = apiUrl(`/api/companies?search=${encodeURIComponent(value)}`);
        console.log('Fetching companies from:', url);
        const response = await axios.get(url);
        console.log('Companies response:', response.data);
        setCompanies(response.data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching companies:', error);
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSelectCompany = (company: Company) => {
    onChange(company.companyName, company.id);
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    if (companies.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Customer Name {required && '*'}
      </label>
      <input
        type="text"
        required={required}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder="Type to search customers..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : companies.length > 0 ? (
            <ul>
              {companies.map((company) => (
                <li
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                >
                  {company.companyName}
                </li>
              ))}
            </ul>
          ) : value.length >= 2 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No customers found. Press Enter to create "{value}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CustomerAutocomplete;

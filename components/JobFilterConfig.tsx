import { useState, useEffect } from 'react';
import type { HHVacancy } from '@/types';

interface JobFilter {
  jobTitle: string;
  keywordsInclude: string;
  keywordsExclude: string;
  minSalary: string;
  maxSalary: string;
  location: string;
  locationName?: string;
  autoApply: boolean;
  coverLetter?: string;
}

interface JobFilterConfigProps {
  onSearchResults?: (results: HHVacancy[]) => void;
  onStatusChange?: (status: 'idle' | 'loading' | 'success' | 'error', message?: string) => void;
  onFilterSave?: () => void;
  onFilterReset?: () => void;
}

// Helper to flatten nested areas
interface AreaNode {
  id: string;
  name: string;
  areas?: AreaNode[];
}
function flattenAreas(areas: AreaNode[], parentName = ''): { id: string; name: string }[] {
  let flat: { id: string; name: string }[] = [];
  for (const area of areas) {
    const fullName = parentName ? `${parentName}, ${area.name}` : area.name;
    flat.push({ id: area.id, name: fullName });
    if (area.areas && area.areas.length > 0) {
      flat = flat.concat(flattenAreas(area.areas, fullName));
    }
  }
  return flat;
}

export default function JobFilterConfig({ 
  onSearchResults, 
  onStatusChange,
  onFilterSave,
  onFilterReset
}: JobFilterConfigProps) {
  const [filter, setFilter] = useState<JobFilter>({
    jobTitle: '',
    keywordsInclude: '',
    keywordsExclude: '',
    minSalary: '',
    maxSalary: '',
    location: '',
    autoApply: false,
    coverLetter: ''
  });
  const [isSearching, setIsSearching] = useState(false);
  const [resumes, setResumes] = useState<HHVacancy[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [autoApplyResults, setAutoApplyResults] = useState<HHVacancy[]>([]);
  const [showCoverLetter, setShowCoverLetter] = useState<boolean>(false);
  const defaultCoverLetter = 'Здравствуйте, очень заинтересовала вакансия';
  const [regionSuggestions, setRegionSuggestions] = useState<{id: string, name: string}[]>([]);
  const [allRegions, setAllRegions] = useState<{id: string, name: string}[]>([]);
  
  // Load saved filter from localStorage on initial load
  useEffect(() => {
    const savedFilter = localStorage.getItem('jobFilter');
    if (savedFilter) {
      setFilter(JSON.parse(savedFilter));
    }
  }, []);
  
  // Fetch resumes after login
  useEffect(() => {
    const fetchResumes = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;
      try {
        const res = await fetch('/api/user/resumes', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setResumes(data.items);
          if (data.items.length > 0) setSelectedResumeId(data.items[0].id);
        }
      } catch (e) {
        console.error('Failed to fetch resumes:', e);
      }
    };
    fetchResumes();
  }, []);
  
  // Fetch and flatten regions from HH.ru API on mount
  useEffect(() => {
    fetch('https://api.hh.ru/areas')
      .then(res => res.json())
      .then(data => {
        setAllRegions(flattenAreas(data));
      })
      .catch(() => setAllRegions([]));
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFilter(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  
  const handleSave = () => {
    // Save filter to localStorage
    localStorage.setItem('jobFilter', JSON.stringify(filter));
    
    // Show success toast or feedback
    alert('Настройки фильтра сохранены');
    
    // Call the onFilterSave callback if it exists
    if (onFilterSave) {
      onFilterSave();
    }
  };
  
  const handleReset = () => {
    setFilter({
      jobTitle: '',
      keywordsInclude: '',
      keywordsExclude: '',
      minSalary: '',
      maxSalary: '',
      location: '',
      autoApply: false,
      coverLetter: ''
    });
    
    // Clear saved filter
    localStorage.removeItem('jobFilter');
    
    // Clear search results
    if (onSearchResults) {
      onSearchResults([]);
    }
    
    if (onStatusChange) {
      onStatusChange('idle');
    }
    
    // Call the onFilterReset callback if it exists
    if (onFilterReset) {
      onFilterReset();
    }
  };
  
  // Autocomplete for region
  const handleRegionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilter(prev => ({ ...prev, locationName: value }));
    if (value.length > 1 && allRegions.length > 0) {
      setRegionSuggestions(
        allRegions.filter(r => r.name.toLowerCase().includes(value.toLowerCase()))
      );
    } else {
      setRegionSuggestions([]);
    }
  };
  const handleRegionSelect = (region: {id: string, name: string}) => {
    setFilter(prev => ({ ...prev, location: region.id, locationName: region.name }));
    setRegionSuggestions([]);
  };
  
  const handleSearch = async () => {
    try {
      setIsSearching(true);
      setAutoApplyResults([]);
      if (onStatusChange) {
        onStatusChange('loading', 'Поиск вакансий...');
      }
      
      // First save the filter
      localStorage.setItem('jobFilter', JSON.stringify(filter));
      
      // Get user ID from localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('Пользователь не найден. Пожалуйста, войдите снова.');
      }
      
      const user = JSON.parse(userData);
      
      // First try to refresh the token
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id
          })
        });
        
        const refreshData = await refreshResponse.json();
        
        if (!refreshResponse.ok) {
          if (refreshData.requireReauth) {
            // Token is completely expired, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('tokenExpiration');
            throw new Error('Срок действия токена истек. Пожалуйста, войдите снова.');
          }
        }
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError);
        // Continue with the search anyway, the API will return a proper error
      }
      
      // Get access token from local storage for direct API call
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('Токен доступа не найден. Пожалуйста, войдите снова.');
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add query text
      if (filter.jobTitle) queryParams.append('text', filter.jobTitle);
      
      // Add salary parameter - must be a number
      if (filter.minSalary) {
        queryParams.append('salary', filter.minSalary);
        queryParams.append('only_with_salary', 'true');
      }
      
      // Add area (region) parameter - use Moscow (1) as default if not specified
      // Area must be a number ID according to HH.ru areas directory
      if (filter.location) {
        queryParams.append('area', filter.location);
      }
      
      // Set page size
      queryParams.append('per_page', '20');
      
      console.log('Search params:', Object.fromEntries(queryParams));

      // Make direct API request to HH.ru via our proxy
      const apiResponse = await fetch(`/api/vacancies/search?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Get the response content
      const responseText = await apiResponse.text();
      console.log('Raw API response:', responseText);
      
      // Parse the response
      let apiData = null;
      try {
        apiData = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error('Failed to parse API response:', e);
        throw new Error('Некорректный ответ от сервера');
      }
      
      // Check for errors in the response
      if (!apiResponse.ok) {
        console.error(`Search API error (status ${apiResponse.status}):`, apiData || 'No body');
        throw new Error(
          (apiData && (apiData.error || apiData.description)) || `Ошибка ${apiResponse.status}`
        );
      }
      
      // Fallback for items
      let results: HHVacancy[] = Array.isArray(apiData?.items) ? apiData.items : [];
      
      if (filter.keywordsExclude) {
        const excludedKeywords = filter.keywordsExclude
          .split(',')
          .map((kw: string) => kw.trim().toLowerCase())
          .filter((kw: string) => kw);
        
        if (excludedKeywords.length > 0) {
          results = results.filter((vacancy: HHVacancy) => {
            const name = vacancy.name.toLowerCase();
            return !excludedKeywords.some((kw: string) => name.includes(kw));
          });
        }
      }
      
      if (onSearchResults) {
        onSearchResults(results);
      }
      
      if (onStatusChange) {
        onStatusChange('success', `Найдено ${results.length} вакансий`);
      }
      
      // Auto-apply logic
      if (filter.autoApply && selectedResumeId && results.length > 0) {
        const applyResults: HHVacancy[] = [];
        for (const vacancy of results) {
          try {
            const applyRes = await fetch('/api/vacancies/apply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                vacancyId: vacancy.id,
                resumeId: selectedResumeId,
                coverLetter: filter.coverLetter || undefined
              })
            });
            const applyData = await applyRes.json();
            applyResults.push({
              ...vacancy,
              success: applyRes.ok,
              response: applyData
            });
          } catch (err) {
            applyResults.push({
              ...vacancy,
              success: false,
              response: { error: err instanceof Error ? err.message : String(err) }
            });
          }
        }
        setAutoApplyResults(applyResults);
      }
      
    } catch (error) {
      console.error('Search error:', error);
      if (onStatusChange) {
        onStatusChange('error', error instanceof Error ? error.message : 'Ошибка при поиске вакансий');
      }
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">Настройки поиска и автоотклика</h2>
      
      <div className="space-y-6">
        {/* Resume selection */}
        <div>
          <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
            Выберите резюме для отклика
          </label>
          <select
            id="resume"
            name="resume"
            value={selectedResumeId}
            onChange={e => setSelectedResumeId(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          >
            {resumes.length === 0 && <option value="">Нет резюме</option>}
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.title || r.profession || r.id}</option>
            ))}
          </select>
        </div>
        
        {/* Job Title */}
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
            Должность / Название вакансии
          </label>
          <input
            type="text"
            id="jobTitle"
            name="jobTitle"
            value={filter.jobTitle}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            placeholder="Например: Python разработчик"
          />
          <p className="mt-1 text-sm text-gray-500">Введите название должности для поиска</p>
        </div>
        
        {/* Keywords to Include */}
        <div>
          <label htmlFor="keywordsInclude" className="block text-sm font-medium text-gray-700">
            Ключевые слова для включения
          </label>
          <textarea
            id="keywordsInclude"
            name="keywordsInclude"
            value={filter.keywordsInclude}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            rows={3}
            placeholder="Например: Python, Django, Flask (разделяйте запятыми)"
          />
          <p className="mt-1 text-sm text-gray-500">Вакансии должны содержать эти ключевые слова</p>
        </div>
        
        {/* Keywords to Exclude */}
        <div>
          <label htmlFor="keywordsExclude" className="block text-sm font-medium text-gray-700">
            Ключевые слова для исключения
          </label>
          <textarea
            id="keywordsExclude"
            name="keywordsExclude"
            value={filter.keywordsExclude}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            rows={3}
            placeholder="Например: PHP, 1C, Bitrix (разделяйте запятыми)"
          />
          <p className="mt-1 text-sm text-gray-500">Вакансии, содержащие эти слова, будут исключены</p>
        </div>
        
        {/* Salary Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minSalary" className="block text-sm font-medium text-gray-700">
              Минимальная зарплата (руб.)
            </label>
            <input
              type="number"
              id="minSalary"
              name="minSalary"
              value={filter.minSalary}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              placeholder="Например: 100000"
            />
          </div>
          <div>
            <label htmlFor="maxSalary" className="block text-sm font-medium text-gray-700">
              Максимальная зарплата (руб.)
            </label>
            <input
              type="number"
              id="maxSalary"
              name="maxSalary"
              value={filter.maxSalary}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              placeholder="Например: 250000"
            />
          </div>
        </div>
        
        {/* Location Autocomplete */}
        <div>
          <label htmlFor="locationName" className="block text-sm font-medium text-gray-700">
            Город / Регион
          </label>
          <input
            type="text"
            id="locationName"
            name="locationName"
            value={filter.locationName || ''}
            onChange={handleRegionInput}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-black placeholder-gray-500"
            placeholder="Начните вводить название города или региона"
            autoComplete="off"
          />
          {regionSuggestions.length > 0 && (
            <ul className="border border-gray-300 rounded-md mt-1 bg-white max-h-40 overflow-y-auto z-10 relative">
              {regionSuggestions.map((region) => (
                <li
                  key={region.id}
                  className="px-4 py-2 cursor-pointer hover:bg-red-100"
                  onClick={() => handleRegionSelect(region)}
                >
                  {region.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-sm text-gray-700">
            Выберите город или регион из списка. Если не найден, будет использован регион по умолчанию (Москва).
          </p>
        </div>
        
        {/* Auto Apply Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoApply"
            name="autoApply"
            checked={filter.autoApply}
            onChange={handleChange}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label htmlFor="autoApply" className="ml-2 block text-sm text-black">
            Автоматически откликаться на подходящие вакансии
          </label>
        </div>
        
        {/* Cover Letter Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowCoverLetter((prev) => !prev)}
            className="mb-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm text-black"
          >
            {showCoverLetter ? 'Убрать сопроводительное письмо' : 'Добавить сопроводительное письмо'}
          </button>
          {showCoverLetter && (
            <div>
              <textarea
                id="coverLetter"
                name="coverLetter"
                value={filter.coverLetter}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-black placeholder-gray-500"
                rows={4}
                placeholder="Введите сопроводительное письмо (опционально)"
              />
              <button
                type="button"
                onClick={() => setFilter(prev => ({ ...prev, coverLetter: defaultCoverLetter }))}
                className="mt-2 px-3 py-1 bg-green-100 rounded hover:bg-green-200 text-sm text-black"
              >
                Использовать стандартное письмо
              </button>
              <p className="mt-1 text-sm text-gray-700">Сопроводительное письмо будет отправлено вместе с откликом, если требуется.</p>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Поиск...
              </>
            ) : (
              'Найти вакансии'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Сохранить фильтр
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Сбросить
          </button>
        </div>
        {/* Auto-apply results summary */}
        {autoApplyResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Результаты автоотклика</h3>
            <ul className="space-y-2">
              {autoApplyResults.map((res) => (
                <li key={res.id} className={res.success ? 'text-green-700' : 'text-red-700'}>
                  <span className="font-medium">{res.name}</span> — {res.success ? 'Отклик отправлен' : `Ошибка: ${res.response?.error || 'Неизвестная ошибка'}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 
import { useState, useEffect } from 'react';
import type { HHVacancy } from '@/types';

interface JobFilter {
  jobTitle: string;
  keywordsInclude: string;
  keywordsExclude: string;
  location: string;
  minSalary: string;
  maxSalary: string;
  coverLetter: string;
  limit: number;
  autoApply: boolean;
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
    location: '',
    minSalary: '',
    maxSalary: '',
    coverLetter: '',
    limit: 20,
    autoApply: false
  });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [resumes, setResumes] = useState<HHVacancy[]>([]);
  const [accessToken, setAccessToken] = useState<string>('');
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
      setAccessToken(accessToken);
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
  
  const handleSearch = async () => {
    if (!accessToken) {
      if (onStatusChange) {
        onStatusChange('error', 'Требуется авторизация');
      }
      return;
    }

    setIsSearching(true);
    if (onStatusChange) {
      onStatusChange('loading', 'Поиск вакансий...');
    }

    try {
      const queryParams = new URLSearchParams();
      
      // Add text search (combines job title and keywords)
      let textSearch = filter.jobTitle || '';
      if (filter.keywordsInclude) {
        const includedKeywords = filter.keywordsInclude
          .split(',')
          .map((kw: string) => kw.trim())
          .filter((kw: string) => kw)
          .join(' ');
        
        if (includedKeywords) {
          if (textSearch) textSearch += ' ';
          textSearch += includedKeywords;
        }
      }
      
      if (textSearch) queryParams.append('text', textSearch);
      
      // Add salary filter
      if (filter.minSalary) queryParams.append('salary', filter.minSalary);
      if (filter.maxSalary) queryParams.append('only_with_salary', 'true');
      
      // Add location filter
      if (filter.location) queryParams.append('area', filter.location);
      
      // Set per_page parameter based on limit
      queryParams.append('per_page', filter.limit.toString());
      
      const response = await fetch(`/api/vacancies/search?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vacancies');
      }

      const apiData = await response.json();
      
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
    } catch (error) {
      console.error('Search error:', error);
      if (onStatusChange) {
        onStatusChange('error', error instanceof Error ? error.message : 'Ошибка при поиске вакансий');
      }
    } finally {
      setIsSearching(false);
    }
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
      coverLetter: '',
      limit: 20,
      autoApply: false
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
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-black">Настройки поиска и автоотклика</h2>
      
      <div className="space-y-6">
        {/* Resume selection */}
        <div>
          <label htmlFor="resume" className="block text-sm font-medium text-black">
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
          <label htmlFor="jobTitle" className="block text-sm font-medium text-black">
            Должность / Название вакансии
          </label>
          <input
            type="text"
            id="jobTitle"
            name="jobTitle"
            value={filter.jobTitle}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-black placeholder-gray-700"
            placeholder="Например: Python разработчик"
          />
        </div>
        
        {/* Keywords to Include */}
        <div>
          <label htmlFor="keywordsInclude" className="block text-sm font-medium text-black">
            Ключевые слова для включения
          </label>
          <textarea
            id="keywordsInclude"
            name="keywordsInclude"
            value={filter.keywordsInclude}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-black placeholder-gray-700"
            rows={3}
            placeholder="Например: Python, Django, Flask (разделяйте запятыми)"
          />
        </div>
        
        {/* Keywords to Exclude */}
        <div>
          <label htmlFor="keywordsExclude" className="block text-sm font-medium text-black">
            Ключевые слова для исключения
          </label>
          <textarea
            id="keywordsExclude"
            name="keywordsExclude"
            value={filter.keywordsExclude}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-black placeholder-gray-700"
            rows={3}
            placeholder="Например: PHP, 1C, Bitrix (разделяйте запятыми)"
          />
        </div>
        
        {/* Salary Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minSalary" className="block text-sm font-medium text-black">
              Минимальная зарплата (руб.)
            </label>
            <input
              type="number"
              id="minSalary"
              name="minSalary"
              value={filter.minSalary}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-black placeholder-gray-700"
              placeholder="Например: 100000"
            />
          </div>
          <div>
            <label htmlFor="maxSalary" className="block text-sm font-medium text-black">
              Максимальная зарплата (руб.)
            </label>
            <input
              type="number"
              id="maxSalary"
              name="maxSalary"
              value={filter.maxSalary}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-black placeholder-gray-700"
              placeholder="Например: 250000"
            />
          </div>
        </div>
        
        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Город / Регион
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={filter.location}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            placeholder="Начните вводить название города или региона"
          />
        </div>
        
        {/* Cover Letter */}
        <div>
          <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700">
            Сопроводительное письмо
          </label>
          <textarea
            id="coverLetter"
            name="coverLetter"
            value={filter.coverLetter}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            rows={4}
            placeholder="Введите текст сопроводительного письма..."
          />
        </div>
        
        {/* Limit */}
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700">
            Лимит вакансий
          </label>
          <select
            id="limit"
            name="limit"
            value={filter.limit}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          >
            <option value={20}>20 вакансий</option>
            <option value={50}>50 вакансий</option>
            <option value={100}>100 вакансий</option>
          </select>
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
        
        {/* Search Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
              'Найти и откликнуться'
            )}
          </button>
        </div>

        {/* Add save and reset buttons */}
        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-200">
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
      </div>
    </div>
  );
} 
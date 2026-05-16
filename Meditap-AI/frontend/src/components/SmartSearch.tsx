import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Stethoscope, Pill, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";

interface SearchResult {
  id: string;
  title: string;
  type: "patient" | "record" | "medication" | "page";
  icon: React.ReactNode;
  action: () => void;
}

export function SmartSearch() {
  const navigate = useNavigate();
  const { patients, medicalRecords } = useApp();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("medicalSearchHistory");
    if (stored) {
      try {
        const parsed = JSON.parse(stored).slice(0, 5);
        setRecentSearches(parsed);
      } catch {
        // Handle parse error
      }
    }
  }, []);

  // Quick page access
  const quickPages: SearchResult[] = [
    {
      id: "medical",
      title: "Medical History",
      type: "page",
      icon: <FileText className="h-4 w-4" />,
      action: () => navigate("/medical-history"),
    },
    {
      id: "prescriptions",
      title: "Prescriptions",
      type: "page",
      icon: <Pill className="h-4 w-4" />,
      action: () => navigate("/prescriptions"),
    },
  ];

  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setResults(quickPages);
      return;
    }

    const query = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search in patients
    if (patients && Array.isArray(patients)) {
      patients.forEach((patient: any) => {
        if (
          patient.name?.toLowerCase().includes(query) ||
          patient.email?.toLowerCase().includes(query)
        ) {
          searchResults.push({
            id: `patient-${patient._id}`,
            title: `Patient: ${patient.name}`,
            type: "patient",
            icon: <Stethoscope className="h-4 w-4" />,
            action: () => {
              navigate(`/patient/${patient._id}`);
              saveSearch(`Patient: ${patient.name}`);
            },
          });
        }
      });
    }

    // Search in medical records
    if (medicalRecords && Array.isArray(medicalRecords)) {
      medicalRecords.forEach((record: any) => {
        if (
          record.type?.toLowerCase().includes(query) ||
          record.diagnosis?.toLowerCase().includes(query)
        ) {
          searchResults.push({
            id: `record-${record._id}`,
            title: `${record.type}: ${record.diagnosis}`,
            type: "record",
            icon: <FileText className="h-4 w-4" />,
            action: () => {
              navigate(`/medical-history`, { state: { recordId: record._id } });
              saveSearch(`${record.type}: ${record.diagnosis}`);
            },
          });
        }
      });
    }

    // Include quick pages if they match
    const matchingPages = quickPages.filter((page) =>
      page.title.toLowerCase().includes(query)
    );
    searchResults.push(...matchingPages);

    setResults(searchResults.slice(0, 8)); // Limit to 8 results
  }, [searchQuery, patients, medicalRecords, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const saveSearch = (title: string) => {
    const history = localStorage.getItem("medicalSearchHistory");
    let searches = history ? JSON.parse(history) : [];

    // Remove duplicate if exists
    searches = searches.filter((s: any) => s.title !== title);

    // Add to front
    searches.unshift({ title, timestamp: new Date().toISOString() });

    // Keep only last 10
    searches = searches.slice(0, 10);

    localStorage.setItem("medicalSearchHistory", JSON.stringify(searches));
    setRecentSearches(searches.slice(0, 5));
    setOpen(false);
  };

  const handleSelect = (result: SearchResult) => {
    result.action();
    setSearchQuery("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full max-w-xs justify-start text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Search records...</span>
          <span className="inline sm:hidden">Search...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search patients, records, pages..."
              className="border-0 outline-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandList>
            {searchQuery.length === 0 ? (
              <>
                {recentSearches.length > 0 && (
                  <CommandGroup heading="Recent">
                    {recentSearches.map((search: any) => (
                      <CommandItem
                        key={search.timestamp}
                        value={search.title}
                        onSelect={() => {
                          setSearchQuery(search.title);
                          performSearch();
                        }}
                      >
                        <Search className="mr-2 h-4 w-4 opacity-50" />
                        <span className="text-sm">{search.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading="Quick Links">
                  {quickPages.map((page) => (
                    <CommandItem
                      key={page.id}
                      value={page.title}
                      onSelect={() => handleSelect(page)}
                    >
                      {page.icon}
                      <span className="ml-2">{page.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : results.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result)}
                  >
                    {result.icon}
                    <span className="ml-2">{result.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Stethoscope, Calendar, Pill, FileText, Loader, AlertCircle } from "lucide-react";
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
import { getStoredAccessToken } from "@/lib/storage";

interface SearchResultFromAPI {
  id: string;
  type: "medical-record" | "medication" | "patient-info";
  title: string;
  subtitle: string;
  matchedFields: string[];
  matchContext: Record<string, any>;
  navigationPath: string;
  patientId?: string;
  patientName?: string;
  recordType?: string;
  visitDate?: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: "patient" | "record" | "medication" | "appointment" | "page" | "medical-record" | "medication" | "patient-info";
  icon: React.ReactNode;
  action: () => void;
  subtitle?: string;
  matchedFields?: string[];
  matchContext?: Record<string, any>;
}

export function SmartSearch() {
  const navigate = useNavigate();
  const { currentPatientId, role, patient, medicationPlans, medicalRecords } = useApp();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      id: "dash",
      title: "Dashboard",
      type: "page",
      icon: <Stethoscope className="h-4 w-4" />,
      action: () => navigate("/dashboard"),
    },
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
    {
      id: "appointments",
      title: "Appointments",
      type: "appointment",
      icon: <Calendar className="h-4 w-4" />,
      action: () => navigate("/appointments"),
    },
  ];

  // Get icon based on result type
  const getIconForType = (type: string) => {
    switch (type) {
      case "medical-record":
        return <FileText className="h-4 w-4" />;
      case "medication":
        return <Pill className="h-4 w-4" />;
      case "patient-info":
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const buildLocalSearchResults = () => {
    const query = searchQuery.trim().toLowerCase();

    if (query.length < 2) {
      return [];
    }

    const localResults: SearchResult[] = [];

    medicationPlans.forEach((plan) => {
      plan.medicines.forEach((medicine) => {
        const haystack = [
          medicine.name,
          medicine.dosage,
          medicine.frequency,
          medicine.duration,
          medicine.prescriptionTag,
          medicine.sourceFileName,
          plan.prescriptionText,
          plan.sourceFileName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (haystack.includes(query)) {
          localResults.push({
            id: `local-med-${plan.id}-${medicine._id}`,
            title: medicine.name,
            subtitle: `${medicine.dosage || "N/A"} - ${medicine.frequency || "N/A"} - ${medicine.duration || ""}`.trim(),
            type: "medication",
            icon: <Pill className="h-4 w-4" />,
            matchedFields: ["medicine-name", "dosage", "frequency", "duration", "prescription-tag"],
            matchContext: {
              medicineName: medicine.name,
              dosage: medicine.dosage,
              frequency: medicine.frequency,
              duration: medicine.duration,
            },
            action: () => {
              navigate("/prescriptions", {
                state: {
                  searchQuery,
                  highlightId: medicine._id,
                  patientId: plan.patient,
                },
              });
              saveSearch(medicine.name);
              setOpen(false);
            },
          });
        }
      });
    });

    medicalRecords.forEach((record) => {
      const haystack = [
        record.title,
        record.diagnosis,
        record.description,
        record.doctorName,
        record.hospital,
        record.department,
        ...(record.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (haystack.includes(query)) {
        localResults.push({
          id: `local-record-${record.id}`,
          title: record.title,
          subtitle: `${record.diagnosis} - ${record.hospital}`,
          type: "record",
          icon: <FileText className="h-4 w-4" />,
          matchedFields: ["title", "diagnosis", "description", "hospital"],
          matchContext: {
            diagnosis: record.diagnosis,
            hospital: record.hospital,
          },
          action: () => {
            navigate("/medical-history", {
              state: {
                searchQuery,
                highlightId: record.id,
                  patientId: currentPatientId || patient?.id,
              },
            });
            saveSearch(record.title);
            setOpen(false);
          },
        });
      }
    });

    if (patient) {
      const patientHaystack = [
        patient.name,
        patient.bloodGroup,
        patient.phone,
        ...(patient.allergies || []),
        ...(patient.chronicDiseases || []),
        ...(patient.currentMedications || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (patientHaystack.includes(query)) {
        localResults.push({
          id: `local-patient-${patient.id}`,
          title: patient.name,
          subtitle: `${patient.bloodGroup}`,
          type: "patient",
          icon: <Stethoscope className="h-4 w-4" />,
          matchedFields: ["name", "bloodGroup", "allergies", "chronicDiseases", "currentMedications"],
          matchContext: {
            name: patient.name,
            bloodGroup: patient.bloodGroup,
          },
          action: () => {
            navigate("/profile", {
              state: {
                searchQuery,
                highlightId: patient.id,
              },
            });
            saveSearch(patient.name);
            setOpen(false);
          },
        });
      }
    }

    return localResults;
  };

  // Perform global search via API
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults(quickPages);
      setError(null);
      return;
    }

    if (searchQuery.trim().length < 2) {
      return;
    }

    // For doctors/staff without a patient selected
    if (!currentPatientId && role !== "patient") {
      setError("Please view a patient's medical history first to search their data");
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("query", searchQuery);
      if (currentPatientId) {
        params.append("patientId", currentPatientId);
      }

      // Use the global API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/['"]|\/+$/g, "") || "https://meditap-ai.onrender.com/api";
      const url = `${apiBaseUrl}/search?${params.toString()}`;

      console.log("Search URL:", url); // Debug log

      const apiResponse = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredAccessToken() || ""}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Search response status:", apiResponse.status); // Debug log

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        console.log("Error data:", errorData); // Debug log
        throw new Error(errorData.message || `Search failed with status ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      console.log("Search results:", data); // Debug log

      const apiResults: SearchResult[] = Array.isArray(data.results)
        ? data.results.map((result: SearchResultFromAPI) => ({
            id: result.id,
            title: result.title,
            subtitle: result.subtitle,
            type: result.type,
            icon: getIconForType(result.type),
            matchedFields: result.matchedFields,
            matchContext: result.matchContext,
            action: () => {
              navigate(result.navigationPath, {
                state: {
                  searchQuery: searchQuery,
                  highlightId: result.id,
                  patientId: result.patientId || currentPatientId || patient?.id,
                  patientId: result.patientId || currentPatientId || patient?.id,
                  matchContext: result.matchContext,
                },
              });
              saveSearch(result.title);
              setOpen(false);
            },
          }))
        : [];

      const localResults = buildLocalSearchResults();
      const mergedResults = [...apiResults, ...localResults].filter(
        (result, index, array) => array.findIndex((item) => item.title === result.title && item.subtitle === result.subtitle) === index
      );

      if (!data.results || !Array.isArray(data.results)) {
        // Show message if backend indicates patient selection needed
        if (data.message) {
          setError(data.message);
        }
        setResults(localResults);
        return;
      }

      // If no results found but no error
      if (mergedResults.length === 0 && !data.message) {
        setResults(localResults);
        return;
      }

      setResults(mergedResults.slice(0, 12));
      setError(null);
    } catch (err) {
      console.error("Search error:", err);
      const localResults = buildLocalSearchResults();
      setResults(localResults);
      setError(localResults.length > 0 ? null : err instanceof Error ? err.message : "Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentPatientId, role, navigate]);

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
  };

  const handleSelect = (result: SearchResult) => {
    result.action();
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full max-w-xs justify-start text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Search all data...</span>
          <span className="inline sm:hidden">Search...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search records, medications, patient info..."
              className="border-0 outline-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {isLoading && <Loader className="h-4 w-4 animate-spin ml-2" />}
          </div>
          <CommandList>
            {error && (
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {searchQuery.length === 0 ? (
              <>
                {recentSearches.length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {recentSearches.map((search: any) => (
                      <CommandItem
                        key={search.timestamp}
                        value={search.title}
                        onSelect={() => {
                          setSearchQuery(search.title);
                        }}
                      >
                        <Search className="mr-2 h-4 w-4 opacity-50" />
                        <span className="text-sm">{search.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading="Quick Navigation">
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
            ) : isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader className="h-4 w-4 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>No results found for "{searchQuery}"</CommandEmpty>
            ) : (
              <CommandGroup heading={`Results (${results.length})`}>
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result)}
                    className="flex-col items-start px-4 py-3 cursor-pointer"
                  >
                    <div className="flex items-center w-full">
                      {result.icon}
                      <div className="ml-2 flex-1">
                        <div className="font-medium text-sm">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                        )}
                      </div>
                    </div>
                    {result.matchedFields && result.matchedFields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 w-full">
                        {result.matchedFields.slice(0, 3).map((field) => (
                          <span
                            key={field}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {field}
                          </span>
                        ))}
                        {result.matchedFields.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{result.matchedFields.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
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

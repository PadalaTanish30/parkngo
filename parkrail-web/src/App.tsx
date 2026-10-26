import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Navigation,
  ParkingSquare,
  Plus,
  QrCode,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TrainFront,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { QRCodeCanvas } from "qrcode.react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";
import "leaflet/dist/leaflet.css";
import "./App.css";

type ParkingLot = {
  id: string;
  name: string;
  station: string;
  stationType: "metro" | "railway";
  city: string;
  state: string;
  area: string;
  distance: string;
  walk: string;
  fullDayPrice: number;
  overnightPrice: number;
  available: number;
  total: number;
  availableTwoWheeler?: number;
  totalTwoWheeler?: number;
  availableFourWheeler?: number;
  totalFourWheeler?: number;
  rating: number;
  accent: string;
  features: string[];
  coordinates: [number, number];
};

type BookingType = "full-day" | "overnight";
type VehicleType = "2-wheeler" | "4-wheeler";

type BookingSummary = {
  reservationId: string;
  lot: ParkingLot;
  bookingType: BookingType;
  arrival: string;
  departure: string;
  arrivalTime: string;
  departureTime: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  vehicleName: string;
  total: number;
  paymentStatus: "initiated" | "paid" | "failed";
  paymentExpiresAt?: string;
  upiLink?: string;
};

const OPERATOR_UID = "77rBmRDzilXGdBqryH9kcpRjHSu1";
const UPI_MERCHANT_VPA =
  import.meta.env.VITE_UPI_MERCHANT_VPA || "padalatanish30@oksbi";
const THEME_STORAGE_KEY = "parkn-go:theme";
const PAYMENT_WINDOW_MS = 15 * 60 * 1000;
const DISCORD_INVITE = "https://discord.gg/avT2Zha4xR";
const BOOKING_TIMES: Record<BookingType, { arrival: string; departure: string }> = {
  "full-day": { arrival: "06:00", departure: "22:00" },
  overnight: { arrival: "18:00", departure: "09:00" },
};

type Theme = "light" | "dark";

const getInitialTheme = (): Theme => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const lots: ParkingLot[] = [
  {
    id: "secunderabad-central",
    name: "Secunderabad Central Parking",
    station: "Secunderabad Junction",
    stationType: "railway",
    city: "Hyderabad",
    state: "Telangana",
    area: "Railway Station Road, Secunderabad",
    distance: "0.2 km",
    walk: "3 min walk",
    fullDayPrice: 180,
    overnightPrice: 240,
    available: 42,
    total: 120,
    rating: 4.8,
    accent: "terracotta",
    features: ["CCTV monitored", "Covered parking", "Station shuttle"],
    coordinates: [17.4334, 78.5013],
  },
  {
    id: "nampally-transit",
    name: "Nampally Transit Parking",
    station: "Hyderabad Deccan",
    stationType: "railway",
    city: "Hyderabad",
    state: "Telangana",
    area: "Nampally Station Road, Hyderabad",
    distance: "0.3 km",
    walk: "4 min walk",
    fullDayPrice: 150,
    overnightPrice: 210,
    available: 28,
    total: 90,
    rating: 4.7,
    accent: "indigo",
    features: ["Open-air", "Well lit", "Accessible spaces"],
    coordinates: [17.393, 78.473],
  },
  {
    id: "kacheguda-park",
    name: "Kacheguda Travel Park",
    station: "Kacheguda",
    stationType: "railway",
    city: "Hyderabad",
    state: "Telangana",
    area: "Kacheguda Station Road, Hyderabad",
    distance: "0.3 km",
    walk: "5 min walk",
    fullDayPrice: 140,
    overnightPrice: 190,
    available: 31,
    total: 100,
    rating: 4.6,
    accent: "olive",
    features: ["CCTV monitored", "Motorbike bays", "24/7 access"],
    coordinates: [17.3784, 78.4983],
  },
  {
    id: "ameerpet-metro",
    name: "Ameerpet Metro Park",
    station: "Ameerpet",
    stationType: "metro",
    city: "Hyderabad",
    state: "Telangana",
    area: "Ameerpet Metro, Hyderabad",
    distance: "0.2 km",
    walk: "3 min walk",
    fullDayPrice: 100,
    overnightPrice: 150,
    available: 19,
    total: 70,
    rating: 4.7,
    accent: "terracotta",
    features: ["CCTV monitored", "Motorbike bays", "Well lit"],
    coordinates: [17.4375, 78.4483],
  },
  {
    id: "secunderabad-east-metro",
    name: "East Metro Park",
    station: "Secunderabad East",
    stationType: "metro",
    city: "Hyderabad",
    state: "Telangana",
    area: "East Metro Station, Secunderabad",
    distance: "0.2 km",
    walk: "3 min walk",
    fullDayPrice: 90,
    overnightPrice: 140,
    available: 24,
    total: 80,
    rating: 4.5,
    accent: "blue",
    features: ["Open-air", "Motorbike bays", "UPI accepted"],
    coordinates: [17.4399, 78.5024],
  },
  {
    id: "raidurg-metro",
    name: "Raidurg Tech District Parking",
    station: "Raidurg",
    stationType: "metro",
    city: "Hyderabad",
    state: "Telangana",
    area: "Raidurg Metro, Hyderabad",
    distance: "0.4 km",
    walk: "6 min walk",
    fullDayPrice: 120,
    overnightPrice: 180,
    available: 36,
    total: 150,
    rating: 4.8,
    accent: "olive",
    features: ["CCTV monitored", "Covered parking", "EV charging"],
    coordinates: [17.4435, 78.386],
  },
];

const stationCoordinates: Record<string, [number, number]> = {
  "Secunderabad Junction": [17.4334, 78.5013],
  "Hyderabad Deccan": [17.393, 78.473],
  Kacheguda: [17.3784, 78.4983],
  Ameerpet: [17.4375, 78.4483],
  "Secunderabad East": [17.4399, 78.5024],
  Raidurg: [17.4435, 78.386],
};

const createMarkerIcon = (kind: "parking" | "station", active = false) =>
  L.divIcon({
    className: `map-marker-wrap ${kind}-marker ${active ? "is-active" : ""}`,
    html: `<span>${kind === "station" ? "↗" : "P"}</span>`,
    iconSize: kind === "station" ? [38, 38] : [32, 32],
    iconAnchor: kind === "station" ? [19, 19] : [16, 16],
    popupAnchor: [0, kind === "station" ? -20 : -16],
  });

const getDirectionsUrl = (lot: ParkingLot) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lot.coordinates[0]},${lot.coordinates[1]}`;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );

const readStoredBooking = (): BookingSummary | null => {
  try {
    const value = window.localStorage.getItem("parkn-go:last-booking");
    return value ? (JSON.parse(value) as BookingSummary) : null;
  } catch {
    return null;
  }
};

const getDays = (start: string, end: string) => {
  const from = new Date(`${start}T12:00:00`).getTime();
  const to = new Date(`${end}T12:00:00`).getTime();
  return Math.max(1, Math.round((to - from) / 86400000));
};

const isValidDateRange = (start: string, end: string) =>
  Boolean(start && end && end >= start);

const isPaymentExpired = (expiresAt?: string) =>
  Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());

const normalizeParkingLot = (
  id: string,
  data: Record<string, unknown>,
): ParkingLot => {
  const fallback = lots.find((lot) => lot.id === id) ?? lots[0];
  const fullDayPrice =
    typeof data.fullDayPrice === "number"
      ? data.fullDayPrice
      : typeof data.price === "number"
        ? data.price
        : fallback.fullDayPrice;
  const total = typeof data.total === "number" ? data.total : fallback.total;
  const available =
    typeof data.available === "number" ? data.available : fallback.available;
  const totalTwoWheeler =
    typeof data.totalTwoWheeler === "number"
      ? data.totalTwoWheeler
      : Math.ceil(total * 0.6);
  const totalFourWheeler =
    typeof data.totalFourWheeler === "number"
      ? data.totalFourWheeler
      : total - totalTwoWheeler;
  return {
    ...fallback,
    ...data,
    id,
    total,
    available,
    totalTwoWheeler,
    totalFourWheeler,
    availableTwoWheeler:
      typeof data.availableTwoWheeler === "number"
        ? data.availableTwoWheeler
        : Math.min(Math.ceil(available * 0.6), totalTwoWheeler),
    availableFourWheeler:
      typeof data.availableFourWheeler === "number"
        ? data.availableFourWheeler
        : Math.min(available - Math.ceil(available * 0.6), totalFourWheeler),
    fullDayPrice,
    overnightPrice:
      typeof data.overnightPrice === "number"
        ? data.overnightPrice
        : Math.round(fullDayPrice * 1.25),
    coordinates: Array.isArray(data.coordinates)
      ? (data.coordinates as [number, number])
      : fallback.coordinates,
  } as ParkingLot;
};

const getVehicleAvailability = (lot: ParkingLot, type: VehicleType) => {
  const total = type === "2-wheeler" ? lot.totalTwoWheeler : lot.totalFourWheeler;
  const available =
    type === "2-wheeler" ? lot.availableTwoWheeler : lot.availableFourWheeler;
  const fallbackTotal =
    type === "2-wheeler" ? Math.ceil(lot.total * 0.6) : lot.total - Math.ceil(lot.total * 0.6);
  const fallbackAvailable =
    type === "2-wheeler"
      ? Math.ceil(lot.available * 0.6)
      : lot.available - Math.ceil(lot.available * 0.6);
  return {
    total: total ?? fallbackTotal,
    available: Math.min(available ?? fallbackAvailable, total ?? fallbackTotal),
  };
};

function App() {
  const today = new Date();
  const defaultArrival = new Date(today.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  const defaultDeparture = new Date(today.getTime() + 3 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [arrival, setArrival] = useState(defaultArrival);
  const [departure, setDeparture] = useState(defaultDeparture);
  const [station, setStation] = useState("Secunderabad Junction");
  const [searched, setSearched] = useState(false);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [confirmed, setConfirmed] = useState<BookingSummary | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("full-day");
  const [arrivalTime, setArrivalTime] = useState(BOOKING_TIMES["full-day"].arrival);
  const [departureTime, setDepartureTime] = useState(
    BOOKING_TIMES["full-day"].departure,
  );
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [upiLink, setUpiLink] = useState("");
  const [lastBookingSummary, setLastBookingSummary] = useState<BookingSummary | null>(
    readStoredBooking,
  );
  const [lastBooking, setLastBooking] = useState<ParkingLot | null>(
    () => readStoredBooking()?.lot ?? null,
  );
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>(lots);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [dataLoading, setDataLoading] = useState(Boolean(db));
  const [bookingSaving, setBookingSaving] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [viewMode, setViewMode] = useState<"passenger" | "admin">("passenger");
  const [resultView, setResultView] = useState<"list" | "map">("list");
  const [focusedLotId, setFocusedLotId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const radioTimerRef = useRef<number | null>(null);

  const days = useMemo(() => getDays(arrival, departure), [arrival, departure]);
  const unitPrice = selectedLot
    ? bookingType === "overnight"
      ? selectedLot.overnightPrice
      : selectedLot.fullDayPrice
    : 0;
  const total = unitPrice * days;
  const selectedVehicleAvailability = vehicleType
    ? getVehicleAvailability(selectedLot ?? lots[0], vehicleType)
    : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => () => {
    if (radioTimerRef.current) window.clearInterval(radioTimerRef.current);
    void audioContextRef.current?.close();
  }, []);

  const toggleRadio = () => {
    if (radioPlaying) {
      if (radioTimerRef.current) window.clearInterval(radioTimerRef.current);
      radioTimerRef.current = null;
      setRadioPlaying(false);
      return;
    }
    const AudioContextClass = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = audioContext;
    const notes = [261.63, 329.63, 392, 523.25, 392, 329.63];
    let noteIndex = 0;
    const playNote = () => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = notes[noteIndex % notes.length];
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.34);
      noteIndex += 1;
    };
    void audioContext.resume();
    playNote();
    radioTimerRef.current = window.setInterval(playNote, 420);
    setRadioPlaying(true);
  };

  const assistantAnswer = assistantQuestion
    ? /payment|upi/i.test(assistantQuestion)
      ? "ParkNGo opens your UPI app after saving a pending reservation. Payment confirmation is completed by the parking operator."
      : /cancel|refund/i.test(assistantQuestion)
        ? "For cancellations or refunds, contact the operator shown in your reservation details."
        : /vehicle|car|bike/i.test(assistantQuestion)
          ? "Choose 2-wheeler or 4-wheeler, then enter the vehicle number and make/model so the operator can identify your vehicle."
          : "Search by station and dates, choose a nearby lot, select your vehicle, and open the digital pass after reserving."
    : "Ask me about booking, UPI payments, vehicles, or cancellations.";

  useEffect(() => {
    if (!auth) {
      return;
    }
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!db) {
      return;
    }
    let active = true;
    getDocs(
      query(
        collection(db, "parkingLots"),
        where("station", "==", station),
        where("status", "==", "Live"),
      ),
    )
      .then((snapshot) => {
        if (!active) return;
        const remoteLots = snapshot.docs.map((document) =>
          normalizeParkingLot(document.id, document.data()),
        );
        setParkingLots(
          remoteLots.length
            ? remoteLots
            : lots.filter((lot) => lot.station === station),
        );
      })
      .catch(() => {
        if (active)
          setParkingLots(lots.filter((lot) => lot.station === station));
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [station]);

  useEffect(() => {
    if (!db || !user) return;
    let active = true;
    getDocs(
      query(collection(db, "reservations"), where("userId", "==", user.uid)),
    )
      .then((snapshot) => {
        if (!active || snapshot.empty) return;
        const reservation = [...snapshot.docs]
          .sort((a, b) =>
            String(b.data().createdAt).localeCompare(
              String(a.data().createdAt),
            ),
          )[0]
          .data();
        const lot =
          parkingLots.find((candidate) => candidate.id === reservation.lotId) ??
          lots.find((candidate) => candidate.id === reservation.lotId);
        if (lot) setLastBooking(lot);
        if (typeof reservation.arrival === "string")
          setArrival(reservation.arrival);
        if (typeof reservation.departure === "string")
          setDeparture(reservation.departure);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, parkingLots]);

  if (viewMode === "admin") {
    return user?.uid === OPERATOR_UID ? (
      <AdminPortal
        user={user}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        onExit={() => setViewMode("passenger")}
      />
    ) : null;
  }

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidDateRange(arrival, departure)) {
      setAuthError("Departure must be on or after arrival.");
      return;
    }
    setAuthError("");
    setShowDashboard(false);
    setSearched(true);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  };

  const chooseLot = (lot: ParkingLot) => {
    setSelectedLot(lot);
    setConfirmed(null);
    setPaymentInitiated(false);
    setUpiLink("");
    const times = BOOKING_TIMES[bookingType];
    setArrivalTime(times.arrival);
    setDepartureTime(times.departure);
    setVehicleType("");
    setVehicleNumber("");
    setVehicleName("");
    setAuthError("");
  };

  const changeBookingType = (nextType: BookingType) => {
    setBookingType(nextType);
    setArrivalTime(BOOKING_TIMES[nextType].arrival);
    setDepartureTime(BOOKING_TIMES[nextType].departure);
  };

  const openOperatorPortal = () => {
    setMenuOpen(false);
    if (user?.uid === OPERATOR_UID) {
      setViewMode("admin");
      return;
    }
    setAuthMode("sign-in");
    setAuthError(
      user
        ? "This account is not linked to an operator workspace."
        : "Sign in with the operator account to continue.",
    );
    setShowAuth(true);
  };

  const confirmBooking = async () => {
    const normalizedVehicleNumber = vehicleNumber.trim().toUpperCase().replace(/\s+/g, " ");
    const normalizedVehicleName = vehicleName.trim();
    if (!vehicleType || normalizedVehicleNumber.length < 4) {
      setAuthError("Select a vehicle type and enter a valid vehicle number.");
      return;
    }
    if (normalizedVehicleName.length < 2) {
      setAuthError("Enter the vehicle make and model, for example Yamaha FZ.");
      return;
    }
    if (!isValidDateRange(arrival, departure)) {
      setAuthError("Departure must be on or after arrival.");
      return;
    }
    if (selectedLot && (!isFirebaseConfigured || user)) {
      setBookingSaving(true);
      try {
        const paymentExpiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString();
        if (db && user) {
          const reservationRef = doc(collection(db, "reservations"));
          const lotRef = doc(db, "parkingLots", selectedLot.id);
          await runTransaction(db, async (transaction) => {
            const lotSnapshot = await transaction.get(lotRef);
            if (!lotSnapshot.exists()) throw new Error("LOT_NOT_FOUND");
            const currentLot = normalizeParkingLot(selectedLot.id, lotSnapshot.data());
            const twoWheeler = getVehicleAvailability(currentLot, "2-wheeler");
            const fourWheeler = getVehicleAvailability(currentLot, "4-wheeler");
            const selectedAvailability = vehicleType === "2-wheeler" ? twoWheeler : fourWheeler;
            if (selectedAvailability.available < 1) throw new Error("NO_VEHICLE_SPACE");

            transaction.update(lotRef, {
              totalTwoWheeler: twoWheeler.total,
              availableTwoWheeler:
                twoWheeler.available - (vehicleType === "2-wheeler" ? 1 : 0),
              totalFourWheeler: fourWheeler.total,
              availableFourWheeler:
                fourWheeler.available - (vehicleType === "4-wheeler" ? 1 : 0),
              available: currentLot.available - 1,
            });
            transaction.set(reservationRef, {
              userId: user.uid,
              operatorId: OPERATOR_UID,
              lotId: selectedLot.id,
              lotName: selectedLot.name,
              station: selectedLot.station,
              stationType: selectedLot.stationType,
              city: selectedLot.city,
              state: selectedLot.state,
              arrival,
              departure,
              arrivalTime,
              departureTime,
              bookingType,
              unitPrice,
              total,
              vehicleType,
              vehicleNumber: normalizedVehicleNumber,
              vehicleName: normalizedVehicleName,
              paymentStatus: "initiated",
              status: "pending",
              createdAt: new Date().toISOString(),
              paymentExpiresAt,
              updatedAt: new Date().toISOString(),
            });
          });
          const upiUrl = new URL("upi://pay");
          upiUrl.searchParams.set("pa", UPI_MERCHANT_VPA);
          upiUrl.searchParams.set("pn", "ParkNGo");
          upiUrl.searchParams.set("am", total.toFixed(2));
          upiUrl.searchParams.set("cu", "INR");
          upiUrl.searchParams.set("tn", `ParkNGo booking ${reservationRef.id}`);
          setPaymentInitiated(true);
          setUpiLink(upiUrl.toString());
          const bookingSummary: BookingSummary = {
            reservationId: reservationRef.id,
            lot: selectedLot,
            bookingType,
            arrival,
            departure,
            arrivalTime,
            departureTime,
            vehicleType,
            vehicleNumber: normalizedVehicleNumber,
            vehicleName: normalizedVehicleName,
            total,
            paymentStatus: "initiated",
            paymentExpiresAt,
            upiLink: upiUrl.toString(),
          };
          setConfirmed(bookingSummary);
          setLastBookingSummary(bookingSummary);
          window.localStorage.setItem(
            "parkn-go:last-booking",
            JSON.stringify(bookingSummary),
          );
        } else {
          const bookingSummary: BookingSummary = {
            reservationId: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            lot: selectedLot,
            bookingType,
            arrival,
            departure,
            arrivalTime,
            departureTime,
            vehicleType,
            vehicleNumber: normalizedVehicleNumber,
            vehicleName: normalizedVehicleName,
            total,
            paymentStatus: "initiated",
            paymentExpiresAt,
          };
          setParkingLots((current) => current.map((lot) => {
            if (lot.id !== selectedLot.id) return lot;
            const nextTwoWheeler = vehicleType === "2-wheeler"
              ? Math.max(0, getVehicleAvailability(lot, "2-wheeler").available - 1)
              : getVehicleAvailability(lot, "2-wheeler").available;
            const nextFourWheeler = vehicleType === "4-wheeler"
              ? Math.max(0, getVehicleAvailability(lot, "4-wheeler").available - 1)
              : getVehicleAvailability(lot, "4-wheeler").available;
            return {
              ...lot,
              availableTwoWheeler: nextTwoWheeler,
              availableFourWheeler: nextFourWheeler,
              available: nextTwoWheeler + nextFourWheeler,
            };
          }));
          setConfirmed(bookingSummary);
          setLastBookingSummary(bookingSummary);
          window.localStorage.setItem(
            "parkn-go:last-booking",
            JSON.stringify(bookingSummary),
          );
        }
        setLastBooking(selectedLot);
      } catch (error) {
        setAuthError(
          error instanceof Error && error.message === "NO_VEHICLE_SPACE"
            ? `No ${vehicleType} spaces are available for this lot.`
            : "We could not save this reservation. Please try again.",
        );
      } finally {
        setBookingSaving(false);
      }
    } else {
      setAuthError("Sign in before confirming a reservation.");
      setShowAuth(true);
    }
  };

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth) {
      setAuthError(
        "Firebase is not configured. Add the VITE_FIREBASE_* values to enable accounts.",
      );
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "sign-up")
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      else await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setShowAuth(false);
      setAuthError("");
      setAuthPassword("");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
              .replace("Firebase: ", "")
              .replace(/ \(auth\/[^)]+\)\.?$/, "")
          : "Unable to authenticate.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ParkNGo home">
          <span className="brand-mark">
            <TrainFront size={20} strokeWidth={2.5} />
          </span>
          <span>
            park
            <span>
              n<span className="brand-go">go</span>
            </span>
          </span>
        </a>
        <button
          className="theme-toggle"
          type="button"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          aria-pressed={theme === "dark"}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === "light" ? "Dark" : "Light"}</span>
        </button>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"}>
          <a href="#how-it-works">How it works</a>
          <a href="#results">Find parking</a>
           <button
             type="button"
             className="nav-dashboard"
             onClick={openOperatorPortal}
          >
            Operator portal <LayoutDashboard size={15} />
          </button>
          <button
            type="button"
            className="nav-dashboard"
            onClick={() => {
              setShowDashboard(true);
              setMenuOpen(false);
            }}
          >
            My bookings <ArrowRight size={15} />
          </button>
          {user ? (
            <button
              type="button"
              className="nav-account"
              onClick={() => auth && signOut(auth)}
            >
              {user.email?.split("@")[0]} · Sign out
            </button>
          ) : (
            <button
              type="button"
              className="nav-account"
              onClick={() => {
                setShowAuth(true);
                setMenuOpen(false);
              }}
            >
              Sign in
            </button>
          )}
        </nav>
        <button
          className="menu-button"
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
              <div className="eyebrow">
               <span className="eyebrow-dot" /> YOUR SPOT BEFORE YOU LEAVE HOME
            </div>
            <h1>
              Start your journey
              <br />
              <em>without the scramble.</em>
            </h1>
            <p className="hero-lede">
              Reserve a verified spot near your Hyderabad Metro or railway
              station, so you can arrive, park, and get to the platform on time.
            </p>
            <div className="hero-proof">
              <span className="avatar-stack">
                <i>R</i>
                <i>M</i>
                <i>A</i>
              </span>
              <span>
                 Know where you will park before the journey begins.
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Illustration of a train journey"
          >
            <div className="route-line">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="hero-ticket">
              <div className="ticket-top">
                <span>YOUR NEXT STOP</span>
                <span>PRK / 24</span>
              </div>
              <div className="ticket-route">
                <div>
                  <small>FROM</small>
                  <strong>HOME</strong>
                </div>
                <ArrowRight size={22} />
                <div>
                  <small>TO</small>
                  <strong>ANYWHERE</strong>
                </div>
              </div>
              <div className="ticket-bottom">
                <span>
                  <MapPin size={14} /> Hyderabad station parking
                </span>
                <span>ParkNGo pass</span>
              </div>
            </div>
            <div className="sun-orb" />
            <div className="hero-spark">
              <Sparkles size={18} />
            </div>
          </div>
        </section>

        <section className="search-wrap" aria-label="Search for parking">
          <form className="search-card" onSubmit={runSearch}>
            <div className="search-card-heading">
              <span className="search-icon">
                <Search size={19} />
              </span>
              <div>
                <strong>Reserve near your station</strong>
                <span>Know your spot before you leave home.</span>
              </div>
            </div>
            <label className="field station-field">
              <span>Station</span>
              <div className="input-with-icon">
                <MapPin size={16} />
                <select
                  value={station}
                  onChange={(event) => {
                    setStation(event.target.value);
                    setDataLoading(Boolean(db));
                  }}
                >
                  <option>Secunderabad Junction</option>
                  <option>Hyderabad Deccan</option>
                  <option>Kacheguda</option>
                  <option>Ameerpet</option>
                  <option>Secunderabad East</option>
                  <option>Raidurg</option>
                </select>
                <ChevronDown size={16} />
              </div>
            </label>
            <label className="field">
              <span>Arrival</span>
              <div className="input-with-icon">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={arrival}
                  onChange={(event) => setArrival(event.target.value)}
                />
              </div>
            </label>
            <label className="field">
              <span>Departure</span>
              <div className="input-with-icon">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={departure}
                  min={arrival}
                  onChange={(event) => setDeparture(event.target.value)}
                />
              </div>
            </label>
            <button className="primary-button search-button" type="submit">
              Search spots <ArrowRight size={17} />
            </button>
          </form>
        </section>

        {showDashboard ? (
          <section className="dashboard-section content-section" id="results">
            <div className="section-heading">
              <div>
                 <div className="eyebrow">YOUR PARKNGo PASS</div>
                <h2>My bookings</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setShowDashboard(false)}
              >
                Back to search <ArrowRight size={15} />
              </button>
            </div>
              {lastBooking && lastBookingSummary ? (
              <div className="dashboard-booking">
                <div
                  className={`dashboard-booking-art lot-image ${lastBooking.accent}`}
                >
                  <div className="lot-image-label">
                    <span>CONFIRMED PASS</span>
                    <strong>{lastBookingSummary.lot.name}</strong>
                  </div>
                  <BadgeCheck size={22} />
                </div>
                <div className="dashboard-booking-info">
                  <div>
                     <div className="eyebrow">YOUR NEXT PARKING RESERVATION</div>
                     <h3>{lastBookingSummary.lot.name}</h3>
                    <p>
                      <MapPin size={14} /> {lastBookingSummary.lot.area}
                    </p>
                  </div>
                  <span className="confirmed-pill">
                    <Check size={13} /> Confirmed
                  </span>
                </div>
                <div className="dashboard-booking-details">
                  <span>
                      <CalendarDays size={15} /> {formatDate(lastBookingSummary.arrival)} -{" "}
                      {formatDate(lastBookingSummary.departure)}
                    </span>
                    <span>
                      <CarFront size={15} /> {lastBookingSummary.vehicleType} · {lastBookingSummary.vehicleNumber}
                    </span>
                    <strong>
                      ₹{lastBookingSummary.total.toLocaleString("en-IN")}
                  </strong>
                </div>
                <button
                  className="primary-button"
                   type="button"
                   onClick={() => {
                     setSelectedLot(lastBooking);
                     setConfirmed(lastBookingSummary);
                      setPaymentInitiated(
                        lastBookingSummary.paymentStatus === "initiated" &&
                        !isPaymentExpired(lastBookingSummary.paymentExpiresAt),
                      );
                   }}
                >
                  Open parking pass <QrCode size={16} />
                </button>
              </div>
            ) : (
              <div className="booking-empty">
                <div className="empty-icon">
                  <QrCode size={25} />
                </div>
                 <h3>Your next parking pass will appear here</h3>
                <p>
                   Reserve a space near your station and keep the QR pass ready
                   for arrival.
                </p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setShowDashboard(false)}
                >
                  Find a parking spot <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="content-section results-section" id="results">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    {searched
                      ? "SPOTS NEAR YOUR STATION"
                      : "READY WHEN YOU ARE"}
                  </div>
                  <h2>
                    {dataLoading
                      ? "Finding available spots"
                      : searched
                       ? `${parkingLots.length} parking options near ${station}`
                       : "A calmer start to every journey"}
                  </h2>
                </div>
                <div className="results-actions">
                  <div className="result-meta">
                    <span className="live-dot" />{" "}
                    {isFirebaseConfigured
                      ? "Live availability"
                      : "Demo availability"}
                  </div>
                  <div
                    className="view-toggle"
                    role="group"
                    aria-label="Change result view"
                  >
                    <button
                      className={resultView === "list" ? "active" : ""}
                      type="button"
                      onClick={() => setResultView("list")}
                    >
                      <ParkingSquare size={14} /> List
                    </button>
                    <button
                      className={resultView === "map" ? "active" : ""}
                      type="button"
                      onClick={() => setResultView("map")}
                    >
                      <MapPin size={14} /> Map
                    </button>
                  </div>
                </div>
              </div>
              {resultView === "map" ? (
                <div className="map-results">
                  <PassengerMap
                    lots={parkingLots}
                    station={station}
                    focusedLotId={focusedLotId}
                    onFocusLot={setFocusedLotId}
                    onReserve={chooseLot}
                  />
                  <div className="map-lot-list">
                    {parkingLots.map((lot) => (
                      <ParkingCard
                        key={lot.id}
                        lot={lot}
                        focused={focusedLotId === lot.id}
                        onFocus={() => setFocusedLotId(lot.id)}
                        onReserve={chooseLot}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="lot-grid">
                  {parkingLots.map((lot) => (
                    <ParkingCard key={lot.id} lot={lot} onReserve={chooseLot} />
                  ))}
                </div>
              )}
            </section>

            <section className="how-section content-section" id="how-it-works">
              <div className="section-heading">
                <div>
                    <div className="eyebrow">FROM HOME TO PLATFORM</div>
                  <h2>Your parking plan, sorted</h2>
                </div>
                <p className="section-aside">
                   No last-minute circling.
                   <br />
                   Just a clearer way to leave.
                </p>
              </div>
              <div className="steps">
                <Step
                  number="01"
                  icon={<Search size={20} />}
                   title="Choose your station"
                   text="Tell us where you are going and the dates you need to leave your vehicle."
                />
                <Step
                  number="02"
                  icon={<BadgeCheck size={20} />}
                   title="Compare available spaces"
                   text="See distance, walking time, facilities, price, and vehicle-specific availability."
                />
                <Step
                  number="03"
                  icon={<TrainFront size={20} />}
                   title="Park and carry your pass"
                   text="Use the QR pass at the lot, then continue to the station without the parking guesswork."
                />
              </div>
            </section>

            <section className="trust-banner content-section">
              <div className="trust-wordmark">
                <ShieldCheck size={26} />
                <span>
                  park
                  <span>
                    n<span className="brand-go">go</span>
                  </span>{" "}
                  / <strong>with care</strong>
                </span>
              </div>
              <p>
                Every spot is verified, monitored, and close enough to make your
                train.
              </p>
              <div className="trust-stats">
                <span>
                   <strong>Live</strong> lot availability
                </span>
                <span>
                   <strong>UPI</strong> payment handoff
                </span>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="brand footer-brand">
          <span className="brand-mark">
            <TrainFront size={17} />
          </span>
          <span>
            park
            <span>
              n<span className="brand-go">go</span>
            </span>
          </span>
        </div>
         <span>Parking near Hyderabad Metro and railway stations.</span>
         <span>Reserve first · Pay in UPI · Show your pass</span>
        <span>Made by Raj, Ram and Tanish 🇮🇳</span>
        <div className="discord-hover">
          <a className="footer-discord" href={DISCORD_INVITE} target="_blank" rel="noreferrer">
            <Users size={14} /> Join the ParkNGo Discord
          </a>
          <div className="discord-card" role="dialog" aria-label="ParkNGo Discord community">
            <div className="discord-avatar">PN</div>
            <div>
              <strong>ParkNGo community</strong>
              <span>Share station tips, ask questions, and meet other commuters.</span>
              <small>Invite code: avT2Zha4xR</small>
            </div>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer">Join server</a>
          </div>
        </div>
        <button className="radio-control" type="button" onClick={toggleRadio} aria-pressed={radioPlaying}>
          {radioPlaying ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {radioPlaying ? "Radio on" : "Play radio"}
        </button>
      </footer>

      <div className="assistant-dock">
        {assistantOpen && (
          <section className="assistant-panel" aria-label="ParkNGo assistant">
            <div className="assistant-heading">
              <div><span className="eyebrow">PARKNGo GUIDE</span><strong>How can I help?</strong></div>
              <button type="button" aria-label="Close assistant" onClick={() => setAssistantOpen(false)}><X size={15} /></button>
            </div>
            <p>{assistantAnswer}</p>
            <div className="assistant-input">
              <input
                value={assistantQuestion}
                placeholder="Ask a question"
                aria-label="Ask the ParkNGo assistant"
                onChange={(event) => setAssistantQuestion(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              />
              <Radio size={15} />
            </div>
          </section>
        )}
        <button className="assistant-button" type="button" onClick={() => setAssistantOpen((open) => !open)}>
          <Sparkles size={16} /> Ask ParkNGo
        </button>
      </div>

      {showAuth && (
        <AuthModal
          mode={authMode}
          email={authEmail}
          password={authPassword}
          error={authError}
          loading={authLoading}
          onClose={() => {
            setShowAuth(false);
            setAuthError("");
          }}
          onModeChange={(mode) => {
            setAuthMode(mode);
            setAuthError("");
          }}
          onEmailChange={setAuthEmail}
          onPasswordChange={setAuthPassword}
          onSubmit={submitAuth}
        />
      )}
      {selectedLot && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedLot(null)}
        >
          <section
            className="booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-button"
              type="button"
              aria-label="Close booking"
              onClick={() => setSelectedLot(null)}
            >
              <X size={18} />
            </button>
            {confirmed ? (
              <div className="confirmation-view">
                <div className="success-mark">
                  <Check size={27} />
                </div>
                 <div className="eyebrow">
                   {paymentInitiated
                     ? "PAYMENT INITIATED"
                     : "RESERVATION CONFIRMED"}
                 </div>
                  <h2 id="booking-title">
                    {paymentInitiated ? "Complete payment in UPI." : "Your spot is waiting."}
                  </h2>
                  <p>
                     {paymentInitiated
                       ? `We created a pending reservation at ${confirmed.lot.name}. Finish the payment in your UPI app within 15 minutes.`
                       : `We saved a place at ${confirmed.lot.name} for your journey.`}
                  </p>
                  {paymentInitiated && confirmed.paymentExpiresAt && (
                    <p className="payment-deadline">
                      Payment window ends at {new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(new Date(confirmed.paymentExpiresAt))}.
                    </p>
                  )}
                 {paymentInitiated && (confirmed.upiLink || upiLink) && (
                   <a
                     className="primary-button full-button upi-link-button"
                     href={confirmed.upiLink || upiLink}
                   >
                     Open UPI app <ArrowRight size={16} />
                   </a>
                 )}
                 <div className="booking-qr">
                   <QRCodeCanvas
                     value={JSON.stringify({
                       app: "ParkNGo",
                       reservationId: confirmed.reservationId,
                       lotId: confirmed.lot.id,
                       station: confirmed.lot.station,
                       vehicleNumber: confirmed.vehicleNumber,
                       vehicleType: confirmed.vehicleType,
                       arrival: confirmed.arrival,
                       departure: confirmed.departure,
                     })}
                     size={164}
                     level="M"
                     includeMargin
                   />
                   <span>{confirmed.reservationId}</span>
                 </div>
                 <div className="confirmation-details">
                   <span>
                     <CalendarDays size={15} /> {formatDate(confirmed.arrival)} -{" "}
                     {formatDate(confirmed.departure)} · {confirmed.arrivalTime} - {confirmed.departureTime}
                   </span>
                   <span>
                     <CarFront size={15} /> {confirmed.vehicleType} · {confirmed.vehicleName} · {confirmed.vehicleNumber}
                   </span>
                 </div>
                <button
                  className="primary-button full-button"
                  type="button"
                  onClick={() => {
                    setSelectedLot(null);
                    setShowDashboard(true);
                  }}
                >
                  View my bookings <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="modal-kicker">
                  {isFirebaseConfigured ? "RESERVATION" : "DEMO RESERVATION"}
                </div>
                <h2 id="booking-title">Reserve {selectedLot.name}</h2>
           <p className="modal-subtitle">
                    A reserved space near {selectedLot.station}. We save the
                    reservation first, then hand payment over to your UPI app.
                </p>
                 <div className="booking-summary">
                   <div>
                     <span>Stay type</span>
                     <strong>
                       {bookingType === "overnight" ? "Overnight" : "Full day"}
                     </strong>
                   </div>
                   <div>
                     <span>Dates</span>
                    <strong>
                      {formatDate(arrival)} - {formatDate(departure)}
                    </strong>
                  </div>
                   <div>
                     <span>Duration</span>
                     <strong>
                       {days} {days === 1 ? "interval" : "intervals"}
                     </strong>
                   </div>
                   <div>
                     <span>Hours</span>
                     <strong>
                       {arrivalTime} - {departureTime}
                     </strong>
                   </div>
                   <div>
                     <span>Total</span>
                    <strong className="summary-total">
                      ₹{total.toLocaleString("en-IN")}
                    </strong>
                   </div>
                 </div>
                 <div className="booking-type-options" aria-label="Stay type">
                   <button
                     className={bookingType === "full-day" ? "is-active" : ""}
                     type="button"
                     onClick={() => changeBookingType("full-day")}
                   >
                     Full day · ₹{selectedLot.fullDayPrice}
                   </button>
                   <button
                     className={bookingType === "overnight" ? "is-active" : ""}
                     type="button"
                     onClick={() => changeBookingType("overnight")}
                   >
                     Overnight · ₹{selectedLot.overnightPrice}
                   </button>
                 </div>
                  <div className="booking-time-fields">
                   <label className="field">
                     <span>Arrival time</span>
                     <input
                       type="time"
                       value={arrivalTime}
                       onChange={(event) => setArrivalTime(event.target.value)}
                     />
                   </label>
                   <label className="field">
                     <span>Departure time</span>
                     <input
                       type="time"
                       value={departureTime}
                       onChange={(event) => setDepartureTime(event.target.value)}
                     />
                   </label>
                  </div>
                  <div className="vehicle-fields">
                     <label className="field">
                       <span>Vehicle type</span>
                      <select
                        value={vehicleType}
                        onChange={(event) =>
                          setVehicleType(event.target.value as VehicleType | "")
                        }
                      >
                        <option value="">Choose vehicle type</option>
                        <option value="2-wheeler">2-wheeler</option>
                         <option value="4-wheeler">4-wheeler</option>
                       </select>
                     </label>
                     {selectedVehicleAvailability && (
                       <p className="vehicle-availability-note">
                         {selectedVehicleAvailability.available} {vehicleType} spaces currently available
                       </p>
                     )}
                    <label className="field">
                      <span>Vehicle number</span>
                      <input
                        type="text"
                        value={vehicleNumber}
                        placeholder="TS 09 AB 1234"
                        maxLength={20}
                        onChange={(event) => setVehicleNumber(event.target.value)}
                      />
                    </label>
                    <label className="field vehicle-name-field">
                      <span>Vehicle make and model</span>
                      <input
                        type="text"
                        value={vehicleName}
                        placeholder="Yamaha FZ or Maruti Swift"
                        maxLength={80}
                        onChange={(event) => setVehicleName(event.target.value)}
                      />
                    </label>
                  </div>
                 <div className="demo-note">
                  <ShieldCheck size={17} />
                   <span>
                     {isFirebaseConfigured
                        ? "Your space is held for 15 minutes while you complete payment in UPI."
                       : "Demo booking · this browser will remember your parking pass."}
                  </span>
                </div>
                {authError && (
                  <p className="auth-error" role="alert">
                    {authError}
                  </p>
                )}
                <button
                  className="primary-button full-button"
                  type="button"
                  disabled={bookingSaving}
                  onClick={confirmBooking}
                >
                  {bookingSaving
                    ? "Saving reservation…"
                    : user || !isFirebaseConfigured
                     ? `Pay ₹${total.toLocaleString("en-IN")} with UPI`
                      : "Sign in to reserve"}{" "}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function AuthModal({
  mode,
  email,
  password,
  error,
  loading,
  onClose,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  mode: "sign-in" | "sign-up";
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onClose: () => void;
  onModeChange: (mode: "sign-in" | "sign-up") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <div
      className="modal-backdrop auth-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="booking-modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close-button"
          type="button"
          aria-label="Close sign in"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="modal-kicker">PARKNGo ACCOUNT</div>
        <h2 id="auth-title">
          {mode === "sign-in" ? "Pick up where you left off." : "Keep your parking pass handy."}
        </h2>
        <p className="modal-subtitle">
          {mode === "sign-in"
            ? "Sign in to view your passes and reserve near your station."
            : "Create an account so your parking passes stay with you across devices."}
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button full-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
        <button
          className="auth-switch"
          type="button"
          onClick={() =>
            onModeChange(mode === "sign-in" ? "sign-up" : "sign-in")
          }
        >
          {mode === "sign-in"
            ? "New to ParkNGo? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </div>
  );
}

function PassengerMap({
  lots,
  station,
  focusedLotId,
  onFocusLot,
  onReserve,
}: {
  lots: ParkingLot[];
  station: string;
  focusedLotId: string | null;
  onFocusLot: (id: string) => void;
  onReserve: (lot: ParkingLot) => void;
}) {
  const stationPosition =
    stationCoordinates[station] ?? stationCoordinates["Secunderabad Junction"];
  const focusedLot = lots.find((lot) => lot.id === focusedLotId);
  const mapCenter = focusedLot?.coordinates ?? stationPosition;

  return (
    <div className="passenger-map">
      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter position={mapCenter} />
        <Marker position={stationPosition} icon={createMarkerIcon("station")}>
          <Popup>
            <strong>{station}</strong>
            <span className="map-popup-label">Railway station</span>
          </Popup>
        </Marker>
        {lots.map((lot) => (
          <Marker
            key={lot.id}
            position={lot.coordinates}
            icon={createMarkerIcon("parking", focusedLotId === lot.id)}
            eventHandlers={{ click: () => onFocusLot(lot.id) }}
          >
            <Popup>
              <div className="map-popup">
                <span className="map-popup-label">
                  {lot.available} spaces available
                </span>
                <strong>{lot.name}</strong>
                <span>
                  {lot.distance} · {lot.walk}
                </span>
                <div>
                  <b>
                     ₹{lot.fullDayPrice}
                     <small>/ full day</small>
                  </b>
                  <button type="button" onClick={() => onReserve(lot)}>
                    Reserve
                  </button>
                </div>
                <a
                  className="directions-link"
                  href={getDirectionsUrl(lot)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation size={12} /> Get directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-key">
        <span>
          <i className="key-dot parking-key" /> Parking
        </span>
        <span>
          <i className="key-dot station-key" /> Station
        </span>
      </div>
      <div className="map-attribution-note">
        Map data © OpenStreetMap contributors
      </div>
    </div>
  );
}

function MapRecenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, map.getZoom(), { duration: 0.6 });
  }, [map, position]);
  return null;
}

function ParkingCard({
  lot,
  focused = false,
  onFocus,
  onReserve,
}: {
  lot: ParkingLot;
  focused?: boolean;
  onFocus?: () => void;
  onReserve: (lot: ParkingLot) => void;
}) {
  return (
    <article
      className={`lot-card ${focused ? "is-focused" : ""}`}
      onClick={onFocus}
    >
      <div className={`lot-image ${lot.accent}`}>
        <div className="lot-image-label">
          <span>PRK</span>
          <strong>{lot.name.split(" ")[0]}</strong>
        </div>
        <span className="availability-badge">
           <span /> {lot.available} spaces available
        </span>
        <div className="lot-grid-lines" />
      </div>
      <div className="lot-card-body">
        <div className="lot-title-row">
          <div>
            <h3>{lot.name}</h3>
            <p>
              <MapPin size={14} /> {lot.area}
            </p>
          </div>
          <span className="rating">★ {lot.rating}</span>
        </div>
        <div className="lot-distance">
          <span>
            <Navigation size={14} /> {lot.distance} from station
          </span>
          <span>
            <Clock3 size={14} /> {lot.walk}
          </span>
        </div>
        <div className="feature-list">
          {lot.features.map((feature) => (
            <span key={feature}>{feature}</span>
          ))}
        </div>
        <div className="lot-footer">
          <div>
             <strong>₹{lot.fullDayPrice}</strong>
             <span>/ full day</span>
          </div>
          <button
            className="outline-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onReserve(lot);
            }}
          >
             Reserve this spot <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function Step({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="step">
      <div className="step-top">
        <span className="step-number">{number}</span>
        <span className="step-icon">{icon}</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

type AdminLot = {
  id: string;
  name: string;
  station: string;
  spaces: number;
  occupied: number;
  status: "Live" | "Paused";
  revenue: string;
};
type AdminReservation = {
  documentId: string;
  id: string;
  lotId: string;
  vehicleType: VehicleType;
  guest: string;
  lot: string;
  dates: string;
  vehicle: string;
  amount: string;
  status:
    | "Confirmed"
    | "Arriving soon"
    | "Completed"
    | "Payment pending"
    | "Payment expired"
    | "Payment failed"
    | "Cancelled";
};

function AdminPortal({
  onExit,
  user,
  theme,
  onToggleTheme,
}: {
  onExit: () => void;
  user: User;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "lots" | "reservations"
  >("overview");
  const [lotsState, setLotsState] = useState<AdminLot[]>([]);
  const [reservationsState, setReservationsState] = useState<AdminReservation[]>([]);
  const [dataLoading, setDataLoading] = useState(Boolean(db));
  const [notice, setNotice] = useState("");
  const [reservationFilter, setReservationFilter] = useState("");

  useEffect(() => {
    if (!db) {
      return;
    }
    Promise.all([
      getDocs(query(collection(db, "parkingLots"), where("operatorId", "==", user.uid))),
      getDocs(query(collection(db, "reservations"), where("operatorId", "==", user.uid))),
    ])
      .then(([lotSnapshot, reservationSnapshot]) => {
        setLotsState(
          lotSnapshot.docs.map((document) => {
            const lot = normalizeParkingLot(document.id, document.data());
            return {
              id: document.id,
              name: lot.name,
              station: lot.station,
              spaces: lot.total,
              occupied: Math.max(0, lot.total - lot.available),
              status: document.data().status === "Live" ? "Live" : "Paused",
              revenue: "₹0",
            };
          }),
        );
        setReservationsState(
          reservationSnapshot.docs.map((document) => {
            const reservation = document.data();
              const status = reservation.status === "cancelled"
                ? "Cancelled"
                : reservation.status === "payment_failed"
                  ? "Payment failed"
                  : reservation.paymentStatus === "initiated" && isPaymentExpired(String(reservation.paymentExpiresAt ?? ""))
                    ? "Payment expired"
                  : reservation.paymentStatus === "initiated"
                    ? "Payment pending"
                  : "Confirmed";
            return {
              documentId: document.id,
              id: `PNG-${document.id.slice(0, 6).toUpperCase()}`,
              lotId: String(reservation.lotId ?? ""),
              vehicleType: reservation.vehicleType === "4-wheeler" ? "4-wheeler" : "2-wheeler",
              guest: String(reservation.userId ?? "Passenger"),
              lot: String(reservation.lotName ?? "Parking lot"),
              dates: `${formatDate(String(reservation.arrival))} - ${formatDate(String(reservation.departure))}`,
              vehicle: `${String(reservation.vehicleType ?? "Vehicle")} · ${String(reservation.vehicleName ?? "")} · ${String(reservation.vehicleNumber ?? "")}`,
              amount: `₹${Number(reservation.total ?? 0).toLocaleString("en-IN")}`,
              status,
            };
          }),
        );
      })
      .catch(() => setNotice("We could not load the operator workspace."))
      .finally(() => setDataLoading(false));
  }, [user.uid]);

  const addLot = async () => {
    if (!db) return;
    try {
      const lotRef = await addDoc(collection(db, "parkingLots"), {
        name: "New Station Lot",
        station: "Ameerpet",
        stationType: "metro",
        city: "Hyderabad",
        state: "Telangana",
        area: "Ameerpet Metro station",
        distance: "0.3 km",
        walk: "4 min walk",
        fullDayPrice: 120,
        overnightPrice: 150,
        available: 60,
        total: 60,
        availableTwoWheeler: 36,
        totalTwoWheeler: 36,
        availableFourWheeler: 24,
        totalFourWheeler: 24,
        rating: 4.5,
        accent: "olive",
        features: ["CCTV monitored"],
        coordinates: [17.4375, 78.4483],
        status: "Paused",
        operatorId: user.uid,
      });
      setLotsState((current) => [
        ...current,
        {
          id: lotRef.id,
          name: "New Station Lot",
          station: "Ameerpet",
          spaces: 60,
          occupied: 0,
          status: "Paused",
          revenue: "₹0",
        },
      ]);
      setNotice("New lot added as a draft. Add its details before going live.");
      setActiveTab("lots");
    } catch {
      setNotice("The new parking lot could not be saved.");
    }
  };

  const filteredReservations = reservationsState.filter((reservation) =>
    `${reservation.guest} ${reservation.lot} ${reservation.vehicle} ${reservation.id}`
      .toLowerCase()
      .includes(reservationFilter.toLowerCase()),
  );

  const updateReservationPayment = async (
    reservation: AdminReservation,
    paymentStatus: "paid" | "failed",
  ) => {
    if (!db) return;
    try {
      const reservationRef = doc(db, "reservations", reservation.documentId);
      if (paymentStatus === "failed") {
        const lotRef = doc(db, "parkingLots", reservation.lotId);
        await runTransaction(db, async (transaction) => {
          const [reservationSnapshot, lotSnapshot] = await Promise.all([
            transaction.get(reservationRef),
            transaction.get(lotRef),
          ]);
          if (!reservationSnapshot.exists() || !lotSnapshot.exists()) throw new Error("RESERVATION_NOT_FOUND");
          const reservationData = reservationSnapshot.data();
          if (reservationData.status !== "pending" || reservationData.paymentStatus !== "initiated") return;
          const currentLot = normalizeParkingLot(reservation.lotId, lotSnapshot.data());
          const twoWheeler = getVehicleAvailability(currentLot, "2-wheeler");
          const fourWheeler = getVehicleAvailability(currentLot, "4-wheeler");
          const nextTwoWheeler = Math.min(twoWheeler.total, twoWheeler.available + (reservation.vehicleType === "2-wheeler" ? 1 : 0));
          const nextFourWheeler = Math.min(fourWheeler.total, fourWheeler.available + (reservation.vehicleType === "4-wheeler" ? 1 : 0));
          transaction.update(lotRef, {
            availableTwoWheeler: nextTwoWheeler,
            availableFourWheeler: nextFourWheeler,
            available: nextTwoWheeler + nextFourWheeler,
          });
          transaction.update(reservationRef, {
            paymentStatus,
            status: "payment_failed",
            updatedAt: new Date().toISOString(),
          });
        });
      } else {
        await updateDoc(reservationRef, {
          paymentStatus,
          status: "confirmed",
          updatedAt: new Date().toISOString(),
        });
      }
      setReservationsState((current) =>
        current.map((item) =>
          item.documentId === reservation.documentId
            ? { ...item, status: paymentStatus === "paid" ? "Confirmed" : "Payment failed" }
            : item,
        ),
      );
      setNotice(paymentStatus === "paid" ? "Payment verified." : "Payment marked as failed.");
    } catch {
      setNotice("The payment status could not be updated.");
    }
  };
  const totalSpaces = lotsState.reduce((sum, lot) => sum + lot.spaces, 0);
  const occupiedSpaces = lotsState.reduce((sum, lot) => sum + lot.occupied, 0);
  const occupancy = totalSpaces
    ? `${Math.round((occupiedSpaces / totalSpaces) * 100)}% full`
    : "No lot data";
  const revenue = reservationsState.reduce(
    (sum, reservation) =>
      sum + (reservation.status === "Confirmed" ? Number(reservation.amount.replace(/[₹,]/g, "")) : 0),
    0,
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-mark">
            <TrainFront size={18} />
          </span>
          <span>
            park
            <span>
              n<span className="brand-go">go</span>
            </span>
          </span>
        </div>
        <div className="admin-account">
          <span className="admin-avatar">AS</span>
          <div>
            <strong>Arvind Spaces</strong>
            <span>Operator account</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav className="admin-nav" aria-label="Operator navigation">
          <span className="admin-nav-label">WORKSPACE</span>
          <button
            className={activeTab === "overview" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard size={17} /> Overview
          </button>
          <button
            className={activeTab === "lots" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("lots")}
          >
            <ParkingSquare size={17} /> My parking lots{" "}
            <span className="nav-count">{lotsState.length}</span>
          </button>
          <button
            className={activeTab === "reservations" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("reservations")}
          >
            <CalendarDays size={17} /> Reservations
          </button>
          <button type="button">
            <Users size={17} /> Guests
          </button>
          <span className="admin-nav-label">ACCOUNT</span>
          <button type="button">
            <Bell size={17} /> Notifications{" "}
            <span className="notification-dot" />
          </button>
          <button type="button">
            <CircleAlert size={17} /> Help centre
          </button>
        </nav>
        <button className="exit-admin" type="button" onClick={onExit}>
          <ArrowRight size={16} /> Back to ParkNGo
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-kicker">
              OPERATOR PORTAL / {activeTab.toUpperCase()}
            </span>
            <h1>
              {activeTab === "overview"
                ? "Good morning, Arvind."
                : activeTab === "lots"
                  ? "Your parking lots"
                  : "Reservations"}
            </h1>
          </div>
          <div className="admin-actions">
            <span className="admin-live">
              <span /> System live
            </span>
            <button
              className="icon-button theme-icon-button"
              type="button"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              aria-pressed={theme === "dark"}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={onToggleTheme}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <button className="admin-profile" type="button">
              AS
            </button>
          </div>
        </header>
        {notice && (
          <button
            className="admin-notice"
            type="button"
            onClick={() => setNotice("")}
          >
            <Check size={16} /> {notice}
            <X size={15} />
          </button>
        )}
        {dataLoading && (
          <p className="panel-description">Loading live workspace data…</p>
        )}
        {activeTab === "overview" && (
          <>
            <section className="admin-kpi-grid">
              <AdminKpi
                 label="Reservations"
                 value={String(reservationsState.length)}
                 change="Live records"
                icon={<CalendarDays size={19} />}
                tone="rust"
              />
              <AdminKpi
                label="Occupied right now"
                 value={`${occupiedSpaces} / ${totalSpaces}`}
                 change={occupancy}
                icon={<CarFront size={19} />}
                tone="blue"
              />
              <AdminKpi
                label="This month’s revenue"
                 value={`₹${revenue.toLocaleString("en-IN")}`}
                 change="Pending and confirmed"
                icon={<TrendingUp size={19} />}
                tone="olive"
              />
              <AdminKpi
                label="Guest satisfaction"
                 value="—"
                 change="Reviews not connected"
                icon={<BadgeCheck size={19} />}
                tone="yellow"
              />
            </section>
            <section className="admin-dashboard-grid">
              <div className="admin-panel occupancy-panel">
                <div className="panel-heading">
                  <div>
                    <span className="admin-kicker">LIVE OCCUPANCY</span>
                    <h2>Spaces fill up after 6am</h2>
                  </div>
                  <select defaultValue="today" aria-label="Occupancy period">
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                  </select>
                </div>
                <div className="occupancy-chart">
                  <div className="chart-y-axis">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>
                  <div className="chart-area">
                    <div className="chart-grid">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <svg
                      viewBox="0 0 600 220"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Occupancy rises through the morning"
                    >
                      <defs>
                        <linearGradient
                          id="occupancyFill"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0"
                            stopColor="#ca5a3c"
                            stopOpacity=".24"
                          />
                          <stop
                            offset="1"
                            stopColor="#ca5a3c"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 194 C48 190, 70 165, 112 170 S166 132, 210 140 S265 90, 302 106 S355 67, 400 78 S458 35, 500 54 S555 18, 600 22 L600 220 L0 220Z"
                        fill="url(#occupancyFill)"
                      />
                      <path
                        d="M0 194 C48 190, 70 165, 112 170 S166 132, 210 140 S265 90, 302 106 S355 67, 400 78 S458 35, 500 54 S555 18, 600 22"
                        fill="none"
                        stroke="#ca5a3c"
                        strokeWidth="3"
                      />
                    </svg>
                    <div className="chart-labels">
                      <span>6am</span>
                      <span>9am</span>
                      <span>12pm</span>
                      <span>3pm</span>
                      <span>6pm</span>
                      <span>9pm</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-panel quick-panel">
                <div className="panel-heading">
                  <div>
                    <span className="admin-kicker">AT A GLANCE</span>
                    <h2>Operator checklist</h2>
                  </div>
                  <CircleAlert size={19} color="#ca5a3c" />
                </div>
                <div className="checklist">
                  <div className="checklist-item is-done">
                    <span>
                      <Check size={13} />
                    </span>
                    <div>
                      <strong>Review today’s arrivals</strong>
                      <small>128 guests are expected</small>
                    </div>
                  </div>
                  <div className="checklist-item">
                    <span>
                      <span className="check-dot" />
                    </span>
                    <div>
                      <strong>Update weekend pricing</strong>
                      <small>Peak rates start this Friday</small>
                    </div>
                    <ArrowRight size={15} />
                  </div>
                  <div className="checklist-item">
                    <span>
                      <span className="check-dot" />
                    </span>
                    <div>
                      <strong>Check North Gate cameras</strong>
                      <small>Last check was 22 hours ago</small>
                    </div>
                    <ArrowRight size={15} />
                  </div>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setActiveTab("reservations")}
                >
                  View all tasks <ArrowRight size={15} />
                </button>
              </div>
            </section>
            <section className="admin-panel table-panel">
              <div className="panel-heading">
                <div>
                  <span className="admin-kicker">RECENT ACTIVITY</span>
                  <h2>Latest reservations</h2>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setActiveTab("reservations")}
                >
                  See all reservations <ArrowRight size={15} />
                </button>
              </div>
                <ReservationTable
                  reservations={reservationsState.slice(0, 3)}
                  onPaymentUpdate={updateReservationPayment}
                />
            </section>
          </>
        )}
        {activeTab === "lots" && (
          <section className="admin-panel full-admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-kicker">SPACE MANAGEMENT</span>
                <h2>Keep every lot accurate</h2>
                <p className="panel-description">
                  Availability and pricing shown here are visible to passengers
                  immediately.
                </p>
              </div>
              <button className="primary-button" type="button" onClick={addLot}>
                <Plus size={16} /> Add parking lot
              </button>
            </div>
            <div className="admin-lots-grid">
              {lotsState.map((lot) => (
                <div
                  className="admin-lot-card"
                  key={`${lot.name}-${lot.station}`}
                >
                  <div className="admin-lot-top">
                    <div className="mini-lot-icon">
                      <ParkingSquare size={18} />
                    </div>
                    <button
                      className="more-button"
                      type="button"
                      aria-label={`More options for ${lot.name}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                  <h3>{lot.name}</h3>
                  <p>
                    <MapPin size={13} /> {lot.station}
                  </p>
                  <div className="lot-capacity">
                    <div>
                      <span>Occupancy</span>
                      <strong>
                        {Math.round((lot.occupied / lot.spaces) * 100)}%
                      </strong>
                    </div>
                    <div className="capacity-track">
                      <i
                        style={{
                          width: `${(lot.occupied / lot.spaces) * 100}%`,
                        }}
                      />
                    </div>
                    <small>
                      {lot.occupied} occupied · {lot.spaces - lot.occupied}{" "}
                      available
                    </small>
                  </div>
                  <div className="admin-lot-footer">
                    <span
                      className={
                        lot.status === "Live" ? "status-live" : "status-paused"
                      }
                    >
                      <span /> {lot.status}
                    </span>
                    <strong>
                      {lot.revenue}
                      <small> revenue</small>
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {activeTab === "reservations" && (
          <section className="admin-panel full-admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-kicker">BOOKING LOG</span>
                <h2>Reservations</h2>
                <p className="panel-description">
                  Search and track every passenger booking across your lots.
                </p>
              </div>
              <button className="outline-button admin-export" type="button">
                Export CSV <ArrowRight size={15} />
              </button>
            </div>
            <label className="admin-search">
              <Search size={16} />
              <input
                placeholder="Search guest, lot or booking ID"
                value={reservationFilter}
                onChange={(event) => setReservationFilter(event.target.value)}
              />
            </label>
            <ReservationTable
              reservations={filteredReservations}
              onPaymentUpdate={updateReservationPayment}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function AdminKpi({
  label,
  value,
  change,
  icon,
  tone,
}: {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="admin-kpi">
      <span className={`kpi-icon ${tone}`}>{icon}</span>
      <span className="kpi-label">{label}</span>
      <strong>{value}</strong>
      <small>
        <TrendingUp size={12} /> {change}
      </small>
    </div>
  );
}

function ReservationTable({
  reservations,
  onPaymentUpdate,
}: {
  reservations: AdminReservation[];
  onPaymentUpdate: (
    reservation: AdminReservation,
    paymentStatus: "paid" | "failed",
  ) => void;
}) {
  return (
    <div className="reservation-table">
      <div className="reservation-row reservation-heading">
        <span>Booking</span>
        <span>Guest</span>
         <span>Parking lot</span>
         <span>Vehicle</span>
         <span>Dates</span>
        <span>Amount</span>
        <span>Status</span>
        <span />
      </div>
      {reservations.length ? (
        reservations.map((reservation) => (
          <div className="reservation-row" key={reservation.id}>
            <strong>{reservation.id}</strong>
            <span className="guest-cell">
              <i>
                {reservation.guest
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </i>
              {reservation.guest}
            </span>
            <span>{reservation.lot}</span>
            <span>{reservation.vehicle}</span>
            <span>{reservation.dates}</span>
            <strong>{reservation.amount}</strong>
            <span
              className={`reservation-status ${reservation.status.toLowerCase().replace(" ", "-")}`}
            >
              <span />
              {reservation.status}
            </span>
            {reservation.status === "Payment pending" || reservation.status === "Payment expired" ? (
              <div className="payment-actions">
                <button
                  className="payment-action is-paid"
                  type="button"
                  onClick={() => onPaymentUpdate(reservation, "paid")}
                >
                  Verify
                </button>
                <button
                  className="payment-action is-failed"
                  type="button"
                  onClick={() => onPaymentUpdate(reservation, "failed")}
                >
                  Fail
                </button>
              </div>
            ) : (
              <button
                className="more-button"
                type="button"
                aria-label={`More options for ${reservation.id}`}
              >
                <MoreHorizontal size={17} />
              </button>
            )}
          </div>
        ))
      ) : (
        <div className="table-empty">No reservations match your search.</div>
      )}
    </div>
  );
}

export default App;

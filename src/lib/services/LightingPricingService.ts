// src/lib/services/LightingPricingService.ts

import { firestore } from "@/lib/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

/**
 * LightingPrice - represents the pricing data for a specific lighting fixture.
 */
export interface LightingPrice {
  fixtureType: string; // e.g. "LED FIXTURE", "FLUSH MOUNT", etc.
  price: number; // Current price in dollars
  lastUpdated: any; // Firestore timestamp indicating when the price was last updated
}

// Define the collection name where fixture pricing data is stored.
const PRICING_COLLECTION = "lighting-prices";

/**
 * fetchRealTimePrice simulates fetching the current price for a given fixture type
 * from an external source. Replace this function with an actual API call or web scraping logic
 * to get real-time data.
 *
 * @param fixtureType - The type of fixture (e.g., "LED FIXTURE", "FLUSH MOUNT").
 * @returns A Promise that resolves to a number representing the current unit price.
 */
async function fetchRealTimePrice(fixtureType: string): Promise<number> {
  // Simulate different pricing based on fixture type.
  // Replace the following switch-case with a fetch call to a real API.
  switch (fixtureType.toLowerCase()) {
    case "led fixture":
      return 4.8;
    case "flush mount":
      return 0; // Often no cost is indicated (or you can adjust as needed)
    case "led strip":
      return 3.08;
    case "track head led":
      return 14.0;
    case "track":
      return 0;
    case "recessed fixture":
      return 9.0;
    case "overhead pendant":
      return 0;
    default:
      return 0; // Default value if fixture type is not recognized
  }
}

/**
 * getFixturePrice retrieves the latest price for the given fixture type from Firebase.
 * If no pricing document exists or if the stored data is older than 24 hours,
 * it fetches the real-time price, updates Firestore, and returns the new price.
 *
 * @param fixtureType - The type of fixture for which to retrieve the price.
 * @returns A Promise that resolves to the current unit price.
 */
export async function getFixturePrice(fixtureType: string): Promise<number> {
  const fixtureKey = fixtureType.toLowerCase().trim();
  const docRef = doc(firestore, PRICING_COLLECTION, fixtureKey);
  const docSnap = await getDoc(docRef);

  let currentPrice: number = 0; // Initialize with a default value
  let shouldUpdate = false;
  const now = Date.now();

  if (docSnap.exists()) {
    const data = docSnap.data() as LightingPrice;
    currentPrice = data.price;
    // Check if the price is older than 24 hours (86,400,000 milliseconds)
    const lastUpdated = data.lastUpdated?.toMillis ? data.lastUpdated.toMillis() : 0;
    if (now - lastUpdated > 86400000) {
      shouldUpdate = true;
    }
  } else {
    shouldUpdate = true;
  }

  if (shouldUpdate) {
    const realTimePrice = await fetchRealTimePrice(fixtureType);
    // Update Firestore with the new price data.
    await setDoc(docRef, {
      fixtureType: fixtureType,
      price: realTimePrice,
      lastUpdated: serverTimestamp(),
    });
    currentPrice = realTimePrice;
  }

  return currentPrice;
}

/**
 * updateFixturePrice manually updates the price for a given fixture type in Firebase.
 *
 * @param fixtureType - The type of fixture.
 * @param price - The new price to set.
 */
export async function updateFixturePrice(
  fixtureType: string,
  price: number
): Promise<void> {
  const fixtureKey = fixtureType.toLowerCase().trim();
  const docRef = doc(firestore, PRICING_COLLECTION, fixtureKey);
  await updateDoc(docRef, {
    price: price,
    lastUpdated: serverTimestamp(),
  });
}

/**
 * getAllFixturePrices fetches all fixture pricing data from Firebase.
 *
 * @returns A Promise that resolves to an array of LightingPrice objects.
 */
export async function getAllFixturePrices(): Promise<LightingPrice[]> {
  const pricingCollection = collection(firestore, PRICING_COLLECTION);
  const querySnapshot = await getDocs(pricingCollection);
  return querySnapshot.docs.map((docSnap) => docSnap.data() as LightingPrice);
}

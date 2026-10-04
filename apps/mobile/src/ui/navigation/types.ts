export type MapTarget = { lon: number; lat: number };

export type RootStackParamList = {
  /** `at` flies to one point and pins it — how another app hands a place over; `layers` naming photos shows
   *  the photo layer for that visit even if it is off. */
  Map: { at?: MapTarget; layers?: string[] } | undefined;
  Settings: undefined;
  LocationSettings: undefined;
  Login: undefined;
  /** Reachable from Login too — switching to the LAN preset must not require signing in first. */
  Developer: undefined;
  DebugLog: undefined;
};

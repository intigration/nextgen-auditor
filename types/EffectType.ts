export enum EffectType {
  ShutdownInitiated = "Shutdown Initiated",
  TripBypassed = "Trip Bypassed",
  AlarmTriggered = "Alarm Triggered",
  ValveOpens = "Valve Opens",
  ValveFailsToOpen = "Valve Fails to Open",
  FanStops = "Fan Stops",
  PlantWideESD = "Plant-Wide Emergency Shutdown",
  SystemReady = "System Ready",
  ControlFlowDiverged = "Control Flow Diverged",
  MotorShutdown = "Motor Shutdown",
  PermissiveBlocked = "Permissive Blocked",
  ManualOverrideAccepted = "Manual Override Accepted"
}
// Directions. Demo mode shows the practice's written directions and a
// simulated "Open in Maps" action instead of linking a real address.
// TODO(production): Google Maps URLs API with the practice's verified place ID.

export const maps = {
  mode: "simulated" as const,
  directionsLabel(address: string) {
    return `Simulated: this would open Maps with directions to ${address}.`;
  },
};

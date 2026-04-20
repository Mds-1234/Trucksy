const getRemainingCapacity = (route, bookings) => {
  const nodes = [route.from, ...(route.stops || []), route.to];
  const segmentCount = nodes.length - 1;
  
  const remaining = Array(segmentCount).fill(null).map(() => ({
    weight: Number(route.capacity) || 0,
    space: Number(route.space) || 0
  }));

  const acceptedBookings = (bookings || []).filter(b => b.routeId === route.id && b.status === "accepted");

  acceptedBookings.forEach(booking => {
    const [bFrom, bTo] = (booking.shipDetails || " ➔ ").split(" ➔ ");
    const bFromIdx = nodes.indexOf(bFrom);
    const bToIdx = nodes.indexOf(bTo);
    const bWeight = Number(booking.shipWeight) || 0;
    const bSpace = Number(booking.shipSpace) || 0;

    if (bFromIdx !== -1 && bToIdx !== -1 && bFromIdx < bToIdx) {
      for (let i = bFromIdx; i < bToIdx; i++) {
        if (remaining[i]) {
          remaining[i].weight -= bWeight;
          remaining[i].space -= bSpace;
        }
      }
    }
  });

  return remaining;
};

export const matchData = (routes, shipments, allBookings = []) => {
  let result = [];

  routes.forEach(route => {
    const remainingSegments = getRemainingCapacity(route, allBookings);

    shipments.forEach(ship => {
      const isDateMatch = !route.date || !ship.date || route.date === ship.date;
      const fullPath = [route.from, ...(route.stops || []), route.to];
      const fromIndex = fullPath.indexOf(ship.from);
      const toIndex = fullPath.indexOf(ship.to);
      
      const isPathMatch = fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;

      let isCapacityMatch = false;
      let isSpaceMatch = false;

      if (isPathMatch) {
        let minWeightAvailable = Infinity;
        let minSpaceAvailable = Infinity;

        for (let i = fromIndex; i < toIndex; i++) {
          if (remainingSegments[i]) {
            if (remainingSegments[i].weight < minWeightAvailable) minWeightAvailable = remainingSegments[i].weight;
            if (remainingSegments[i].space < minSpaceAvailable) minSpaceAvailable = remainingSegments[i].space;
          }
        }

        isCapacityMatch = minWeightAvailable >= ship.weight;
        isSpaceMatch = (!route.space || !ship.space) || (minSpaceAvailable >= ship.space);
      }

      if (isDateMatch && isPathMatch && isCapacityMatch && isSpaceMatch) {
        result.push({ route, ship });
      }
    });
  });

  return result;
};
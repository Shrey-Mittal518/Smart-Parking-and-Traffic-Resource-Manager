function scheduleFCFS(requests) {
  return [...requests];
}

function scheduleRequests(requests) {
  const emergencyRequests = requests.filter(
    (request) => request.priority === 'emergency',
  );
  if (!emergencyRequests.length) return scheduleFCFS(requests);

  const otherRequests = requests.filter(
    (request) => request.priority !== 'emergency',
  );
  return [...scheduleFCFS(emergencyRequests), ...scheduleFCFS(otherRequests)];
}

module.exports = { scheduleRequests };

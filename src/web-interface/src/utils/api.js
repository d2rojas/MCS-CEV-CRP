// API configuration utility
const getBackendUrl = () => {
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:3004';
};

export default getBackendUrl;

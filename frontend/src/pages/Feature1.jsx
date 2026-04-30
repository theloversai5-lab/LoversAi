// pages/Feature1.jsx - Update the import
import React from 'react';
// If this page needs network calls, import axios where used.
// Or import from your api file
// import { apiFetch } from '../api/api';

const Feature1 = () => {
  // If you need to make API calls in this component, use:
  // const fetchData = async () => {
  //   try {
  //     const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/...`);
  //     // Or use: const data = await apiFetch('/endpoint');
  //   } catch (error) {
  //     console.error('Error:', error);
  //   }
  // };
  
  return (
    <div>
      {/* Your Feature1 component content */}
      <h1>Feature 1 Page</h1>
    </div>
  );
};

export default Feature1
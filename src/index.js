import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createClient } from "@supabase/supabase-js";
import { AuthProvider } from './contexts/AuthContext';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Add error handling for missing environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  console.error('REACT_APP_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseKey ? 'Present' : 'Missing');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

ReactDOM.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

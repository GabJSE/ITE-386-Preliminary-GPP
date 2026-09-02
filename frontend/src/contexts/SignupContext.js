import React, { createContext, useContext, useState } from 'react';

const SignupContext = createContext(null);

export function SignupProvider({ children }) {
  const initialData = {
    role: 'jobhunter', // default: job hunter / employee
    // Step 1: account
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  confirmPassword: '',
    emailVerified: false,
  // whether verification was sent (so UI can preserve OTP state)
  verificationSent: false,
    // Step 2: contact
    phone: '',
    phoneCountry: '+63',
    address: '',
    city: '',
    stateprovince: '',
    dateOfBirth: '',
    gender: '',
    // Step 3: professional
    resumeUrl: '',
    summary: '',
    skills: [],
    // student-related
    isStudent: false,
    schoolName: '',
    program: '',
    yearLevel: '',
    expectedGraduationDate: '',
    studentId: '',
    education: '',
    experienceYears: '',
    desiredPosition: '',
    workSetup: '',
    expectedSalary: '',
    // Step 4: preferences
    jobType: '',
  };

  const [data, setData] = useState(initialData);

  const [currentStep, setCurrentStep] = useState(1);

  const update = (patch) => setData(d => ({ ...d, ...patch }));
  const reset = () => setData(initialData);

  return (
    <SignupContext.Provider value={{ data, update, reset, currentStep, setCurrentStep }}>
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error('useSignup must be used inside SignupProvider');
  return ctx;
}

export default SignupContext;

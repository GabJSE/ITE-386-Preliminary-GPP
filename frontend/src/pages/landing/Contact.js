import React, { useState, useRef } from "react";
import "./Contact.css";

// Dummy validatePhone function (replace with your actual validation)
const validatePhone = async (country, phone) => {
  const valid = /^\d{10}$/.test(phone); // Example: 10 digits for +63
  return { valid };
};

const Contact = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const phoneRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phone number
    const country = "+63"; // Can make dynamic if needed
    const result = await validatePhone(country, phone);

    if (!result.valid) {
      setPhoneError("Invalid phone number");
      if (phoneRef.current) {
        phoneRef.current.focus();
        phoneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setPhoneError("");
    alert("Form submitted successfully!");
    // Here you can add your form submission logic
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        <h1>Contact Us</h1>
        <p>If you have any questions, feel free to reach out to us!</p>

        <form className="contact-form" onSubmit={handleSubmit}>
  <div className="name-fields">
    <label>
      First Name*
      <input
        type="text"
        placeholder="First name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
    </label>
    
    <label>
      Last Name*
      <input
        type="text"
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
    </label>
  </div>

  <label>
    Email:
    <input
      type="email"
      placeholder="Your Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  </label>

  <label>
    Phone Number*
    <input
      type="tel"
      placeholder="Enter your phone number"
      ref={phoneRef}
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
    />
  </label>
  {phoneError && <p className="error">{phoneError}</p>}

  <label>
    Subject*
    <input
      type="text"
      placeholder="Write the subject of your request here"
      value={subject}
      onChange={(e) => setSubject(e.target.value)}
    />
  </label>

  <label>
    Write Your Message:
    <textarea
      placeholder="Write a letter"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
    ></textarea>
  </label>

  <button type="submit">Send Message</button>
</form>

      </div>
    </div>
  );
};

export default Contact;

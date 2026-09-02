import React, { useState } from "react";
import "./ChangePasswordModal.css";

const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmOldPassword, setConfirmOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validation checks
    if (currentPassword !== confirmOldPassword) {
      setMessage("Old passwords do not match.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage("New passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setMessage("Password successfully changed!");
        setCurrentPassword("");
        setConfirmOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setMessage(data.message || "Something went wrong.");
      }
    } catch (err) {
      setMessage("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Change Password</h3>
        <form onSubmit={handleSubmit}>
          {/* 🔹 Current password */}
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          {/* 🔹 Confirm old password */}
          <input
            type="password"
            placeholder="Confirm old password"
            value={confirmOldPassword}
            onChange={(e) => setConfirmOldPassword(e.target.value)}
            required
          />

          {/* 🔹 New password */}
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          {/* 🔹 Confirm new password */}
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />

          <div className="buttons">
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Update Password"}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default ChangePasswordModal;

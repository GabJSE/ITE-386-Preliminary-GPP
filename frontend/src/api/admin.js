export const getAdminStats = async () => {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) {
      console.warn('getAdminStats: endpoint returned', res.status);
      return {};
    }
    return res.json();
  } catch (err) {
    console.warn('getAdminStats failed:', err);
    return {};
  }
};

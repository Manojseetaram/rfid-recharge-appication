const API_BASE =
  "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";


export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE}/warden/login-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

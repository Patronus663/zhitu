import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { userApi } from "@/utils/api";
import { FontAwesome6 } from "@expo/vector-icons";

export default function LoginScreen() {
  const { login, signUp, isLoading: authLoading } = useAuth();
  const router = useSafeRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState("");

  // 登录成功后按业务用户是否存在分流：已有档案 → 主界面，否则 → 引导页
  const routeAfterAuth = async (authUserId: string) => {
    try {
      await userApi.get(authUserId);
      router.replace("/(tabs)");
    } catch {
      router.replace("/onboarding");
    }
  };

  const handleSubmit = async () => {
    if (buttonLoading) return;
    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }
    setButtonLoading(true);
    setError("");
    try {
      if (mode === "login") {
        const authUser = await login(email.trim(), password);
        await routeAfterAuth(authUser.id);
      } else {
        const { user: authUser, hasSession } = await signUp(email.trim(), password);
        if (hasSession && authUser) {
          await routeAfterAuth(authUser.id);
        } else {
          setError("注册成功，请前往邮箱完成验证后登录");
          setMode("login");
        }
      }
    } catch (e: any) {
      setError(e?.message || (mode === "login" ? "登录失败，请检查邮箱和密码" : "注册失败，请重试"));
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <Screen backgroundColor="#F5F5FA">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <FontAwesome6 name="graduation-cap" size={28} color="#fff" />
            </View>
            <Text style={styles.logoText}>知途</Text>
          </View>
          <Text style={styles.slogan}>南大学子的智能学习助手</Text>

          {/* Mode switch */}
          <View style={styles.switch}>
            {(["login", "signup"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.switchBtn, mode === m && styles.switchBtnActive]}
                onPress={() => {
                  setMode(m);
                  setError("");
                }}
              >
                <Text style={[styles.switchText, mode === m && styles.switchTextActive]}>
                  {m === "login" ? "登录" : "注册"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.card}>
            <View style={styles.field}>
              <FontAwesome6 name="envelope" size={16} color="#7C6FE8" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="邮箱"
                placeholderTextColor="#B0AEE8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.field}>
              <FontAwesome6 name="lock" size={16} color="#7C6FE8" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder={mode === "login" ? "密码" : "设置密码（至少 6 位）"}
                placeholderTextColor="#B0AEE8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submit, buttonLoading && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{mode === "login" ? "登 录" : "注 册"}</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 60 },
  logoRow: { alignItems: "center", gap: 12 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#6C5CE7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logoText: { fontSize: 34, fontWeight: "800", color: "#2A2440", marginTop: 8 },
  slogan: { textAlign: "center", color: "#7C6FE8", marginTop: 8, fontSize: 14 },
  switch: {
    flexDirection: "row",
    backgroundColor: "#EDEBFA",
    borderRadius: 14,
    padding: 4,
    marginTop: 40,
  },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
  switchBtnActive: { backgroundColor: "#6C5CE7" },
  switchText: { color: "#6C5CE7", fontWeight: "600" },
  switchTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F5FC",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  fieldIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, color: "#2A2440", fontSize: 15 },
  error: { color: "#E0364F", fontSize: 13, marginBottom: 12 },
  submit: {
    backgroundColor: "#6C5CE7",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backBtn: { alignItems: "center", marginTop: 24 },
  backText: { color: "#8A87A0", fontSize: 14 },
});
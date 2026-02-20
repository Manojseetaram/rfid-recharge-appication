import React, { useEffect, useRef } from "react";
import {
  Modal, View, Text, StyleSheet,
  TouchableOpacity, Animated, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

type AlertType = "success" | "error" | "confirm";

interface CustomAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function CustomAlert({
  visible,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
}: CustomAlertProps) {

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
      iconScale.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start();
      });
    }
  }, [visible]);

  const config = {
    success: {
      icon: "checkmark-circle" as const,
      color: "#4ADE80",
      bg: "rgba(74,222,128,0.12)",
      border: "rgba(74,222,128,0.25)",
      confirmBg: "#4ADE80",
      confirmText: "#0F0A2E",
    },
    error: {
      icon: "close-circle" as const,
      color: "#FF5252",
      bg: "rgba(255,82,82,0.12)",
      border: "rgba(255,82,82,0.25)",
      confirmBg: "#FF5252",
      confirmText: "#FFF",
    },
    confirm: {
      icon: "help-circle" as const,
      color: "#F2CB07",
      bg: "rgba(242,203,7,0.12)",
      border: "rgba(242,203,7,0.25)",
      confirmBg: "#F2CB07",
      confirmText: "#1A0E4F",
    },
  }[type];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel || onConfirm}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Top accent line */}
          <View style={[styles.topAccent, { backgroundColor: config.color }]} />

          {/* Corner brackets */}
          <View style={[styles.cornerTL, { borderColor: config.color + "40" }]} />
          <View style={[styles.cornerBR, { borderColor: config.color + "20" }]} />

          {/* Icon */}
          <Animated.View
            style={[
              styles.iconWrap,
              {
                backgroundColor: config.bg,
                borderColor: config.border,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Ionicons name={config.icon} size={44} color={config.color} />
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={styles.btnRow}>
            {type === "confirm" && onCancel && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancel}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: config.confirmBg },
                type !== "confirm" && styles.confirmBtnFull,
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmText, { color: config.confirmText }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#151030",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
    // Glassmorphism shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },

  // Top accent stripe
  topAccent: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 2,
    opacity: 0.8,
  },

  // Corner brackets
  cornerTL: {
    position: "absolute", top: 0, left: 0,
    width: 24, height: 24,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderTopLeftRadius: 24,
  },
  cornerBR: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderBottomRightRadius: 24,
  },

  // Icon
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 8,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 20,
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmBtnFull: {
    flex: 1,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
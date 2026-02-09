import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  const getIcon = () => {
    switch (type) {
      case "success":
        return <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />;
      case "error":
        return <Ionicons name="close-circle" size={64} color="#FF5252" />;
      case "confirm":
        return <Ionicons name="help-circle" size={64} color="#F2CB07" />;
    }
  };

  const getIconBackground = () => {
    switch (type) {
      case "success":
        return "rgba(76, 175, 80, 0.1)";
      case "error":
        return "rgba(255, 82, 82, 0.1)";
      case "confirm":
        return "rgba(242, 203, 7, 0.1)";
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: getIconBackground() }]}>
            {getIcon()}
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {type === "confirm" && onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1426",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  confirmButton: {
    backgroundColor: "#F2CB07",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1426",
  },
});
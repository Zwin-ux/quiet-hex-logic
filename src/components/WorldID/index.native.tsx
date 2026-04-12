import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit-react-native';
import { Scan, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useWorldID } from '@/hooks/useWorldID';
import {
  getWorldIdAction,
  getWorldIdAppId,
  getWorldIdConfigurationIssue,
} from '@/lib/worldIdConfig';

export default function WorldIDWidget() {
  const { user } = useAuth();
  const { isVerified, isVerifying, isLoading, verifiedAt, error, verifyProof, clearError, canVerify } = useWorldID();
  const worldIdAppId = getWorldIdAppId();
  const worldIdAction = getWorldIdAction();
  const configurationIssue = getWorldIdConfigurationIssue();

  const handleVerify = async (result: ISuccessResult) => {
    const { success, error: verifyError } = await verifyProof({
      merkle_root: result.merkle_root,
      nullifier_hash: result.nullifier_hash,
      proof: result.proof,
      verification_level: result.verification_level === 'orb' ? 'orb' : 'device',
    });

    if (success) {
      Alert.alert('Verified', 'Humanity verified successfully!');
    } else {
      Alert.alert('Verification Failed', verifyError || 'Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Scan size={24} color="#a1a1aa" />
          <Text style={styles.title}>World ID</Text>
        </View>
        <ActivityIndicator color="#a1a1aa" style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (isVerified) {
    return (
      <View style={styles.cardSuccess}>
        <View style={styles.header}>
          <CheckCircle2 size={24} color="#4ade80" />
          <Text style={styles.titleSuccess}>Verified Human</Text>
        </View>
        <Text style={styles.description}>
          You have successfully verified your humanity.
        </Text>
        {verifiedAt && (
          <Text style={styles.footerText}>
            Verified on {new Date(verifiedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Scan size={24} color="#a1a1aa" />
        <Text style={styles.title}>World ID</Text>
      </View>
      <Text style={styles.description}>
        Verify your humanity to earn the "Verified Human" badge.
      </Text>

      {configurationIssue && (
        <View style={styles.infoBox}>
          <Text style={styles.footerText}>{configurationIssue}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <IDKitWidget
          app_id={worldIdAppId}
          action={worldIdAction}
          signal={user?.id || ''}
          onSuccess={handleVerify}
          handleVerify={async () => {
            return Promise.resolve();
          }}
          verification_level={VerificationLevel.Device}
        >
          {({ open }) => (
            <TouchableOpacity
              onPress={open}
              style={[styles.button, isVerifying && styles.buttonDisabled]}
              disabled={isVerifying || !canVerify}
            >
              {isVerifying ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.buttonText}>
                  {canVerify ? 'Verify with World ID' : 'World ID unavailable'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </IDKitWidget>
        <Text style={styles.footerText}>
          This checks you are a unique human without revealing your identity.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardSuccess: {
    backgroundColor: 'rgba(20, 83, 45, 0.2)',
    borderColor: 'rgba(20, 83, 45, 0.5)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f4f4f5',
  },
  titleSuccess: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4ade80',
  },
  description: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 16,
  },
  content: {
    marginTop: 8,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
  footerText: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 12,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flex: 1,
  },
  errorDismiss: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
    borderColor: 'rgba(113, 113, 122, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
});

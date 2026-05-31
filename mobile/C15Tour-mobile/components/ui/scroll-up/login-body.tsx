import { ThemedText } from "@/components/themed-text";
import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/auth";
import { useAppTheme } from "@/context/theme";
import { useRouter } from "expo-router";

function LoginBody() {
    const [active, setActive] = useState<'participant' | 'leader' | ''>('participant');
    const [participantCode, setParticipantCode] = useState('');
    const [leaderCode, setLeaderCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const { colorScheme } = useAppTheme();
    const isDark = colorScheme === 'dark';

    const handleLogin = async () => {
        if (!active) {
            Alert.alert('Erreur', 'Veuillez choisir un rôle.');
            return;
        }

        const code = active === 'participant' ? participantCode : leaderCode;
        if (!code.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un code.');
            return;
        }

        const endpoint = active === 'participant'
            ? `${API_BASE_URL}/api/trips/code/${code.trim()}`
            : `${API_BASE_URL}/api/trips/admin/${code.trim()}`;

        setLoading(true);
        try {
            const response = await fetch(endpoint, { method: 'GET' });
            const data = await response.json();

            if (!response.ok) {
                Alert.alert('Erreur', data.error || 'Convoi introuvable.');
                return;
            }

            login(data, active);
            router.replace('/(tabs)/loader');

        } catch {
            Alert.alert('Erreur', 'Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    const colors = {
        accent: '#BB487C',
        inputBorder: '#BB487C',
        inputBg: isDark ? '#2c2c2e' : '#fff',
        inputText: isDark ? '#ECEDEE' : '#11181C',
        inputDisabledBg: isDark ? '#3a3a3c' : '#eee',
        inputDisabledText: isDark ? '#6c6c6e' : '#999',
        separatorText: '#BB487C',
    };

    return (
        <View style={styles.container}>

            {/* Button Participant */}
            <TouchableOpacity
                style={styles.row}
                onPress={() => setActive('participant')}
            >
                <View style={[styles.outer, { borderColor: colors.accent }]}>
                    {active === 'participant' && <View style={[styles.inner, { backgroundColor: colors.accent }]} />}
                </View>
                <ThemedText style={[styles.label, { color: colors.accent }]}>Participant</ThemedText>
            </TouchableOpacity>

            {/* Input Participant */}
            <BottomSheetTextInput
                style={[
                    styles.input,
                    { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.inputText },
                    active === 'leader' && { backgroundColor: colors.inputDisabledBg, color: colors.inputDisabledText },
                ]}
                placeholderTextColor={isDark ? '#8e8e93' : '#aaa'}
                editable={active !== 'leader'}
                placeholder="Code participant (6 caractères)"
                value={participantCode}
                onChangeText={setParticipantCode}
                autoCapitalize="characters"
                maxLength={6}
            />

            {/* Separator */}
            <View style={styles.separatorContainer}>
                <View style={[styles.line, { backgroundColor: colors.accent }]} />
                <Text style={[styles.text, { color: colors.separatorText }]}>OU</Text>
                <View style={[styles.line, { backgroundColor: colors.accent }]} />
            </View>

            {/* Button Leader */}
            <TouchableOpacity
                style={styles.row}
                onPress={() => setActive('leader')}
            >
                <View style={[styles.outer, { borderColor: colors.accent }]}>
                    {active === 'leader' && <View style={[styles.inner, { backgroundColor: colors.accent }]} />}
                </View>
                <Text style={[styles.label, { color: colors.accent }]}>Leader</Text>
            </TouchableOpacity>

            {/* Input Leader */}
            <BottomSheetTextInput
                style={[
                    styles.input,
                    { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.inputText },
                    active === 'participant' && { backgroundColor: colors.inputDisabledBg, color: colors.inputDisabledText },
                ]}
                placeholderTextColor={isDark ? '#8e8e93' : '#aaa'}
                editable={active !== 'participant'}
                placeholder="Code leader (8 caractères)"
                value={leaderCode}
                onChangeText={setLeaderCode}
                autoCapitalize="characters"
                maxLength={8}
            />

            {/* Submit Button */}
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleLogin} disabled={loading}>
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>EN ROUTE !</Text>
                }
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 16,
    },
    outer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    label: {
        marginLeft: 10,
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        padding: 12,
        borderRadius: 6,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    line: {
        flex: 1,
        height: 1,
    },
    text: {
        marginHorizontal: 12,
        fontSize: 14,
    },
    button: {
        marginTop: 30,
        padding: 12,
        alignItems: 'center',
        borderRadius: 6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LoginBody;

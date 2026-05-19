import { ThemedText } from "@/components/themed-text";
import { Button } from "@react-navigation/elements";
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { API_BASE_URL } from "@/constants/api";


function LoginBody() {
    const [active, setActive] = useState<'participant' | 'leader' | ''>('');
    const [participantCode, setParticipantCode] = useState('');
    const [leaderCode, setLeaderCode] = useState('');

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

        try {
            const response = await fetch(endpoint, { method: 'GET' });
            const data = await response.json();

            if (!response.ok) {
                Alert.alert('Erreur', data.error || 'Convoi introuvable.');
                return;
            }

            console.log('Trip data:', data);

        } catch (err) {
            Alert.alert('Erreur', 'Erreur réseau. Vérifiez votre connexion.');
        }
    };

    return (
        <View style={styles.container}>

            {/* Button Participant */}
            <TouchableOpacity
                style={styles.row}
                onPress={() => setActive('participant')}
            >
                <View style={styles.outer}>
                    {active === 'participant' && <View style={styles.inner} />}
                </View>
                <ThemedText style={styles.label}>Participant</ThemedText>
            </TouchableOpacity>

            {/* Input Participant */}
            <TextInput
                style={[
                    styles.input,
                    active === 'leader' && styles.inputDisabled,
                ]}
                editable={active !== 'leader'}
                placeholder="Code participant (6 caractères)"
                value={participantCode}
                onChangeText={setParticipantCode}
                autoCapitalize="characters"
                maxLength={6}
            />

            {/* Separator */}
            <View style={styles.separatorContainer}>
                <View style={styles.line} />
                <Text style={styles.text}>OU</Text>
                <View style={styles.line} />
            </View>

            {/* Button Leader */}
            <TouchableOpacity
                style={styles.row}
                onPress={() => setActive('leader')}
            >
                <View style={styles.outer}>
                    {active === 'leader' && <View style={styles.inner} />}
                </View>
                <Text style={styles.label}>Leader</Text>
            </TouchableOpacity>

            {/* Input Leader */}
            <TextInput
                style={[
                    styles.input,
                    active === 'participant' && styles.inputDisabled,
                ]}
                editable={active !== 'participant'}
                placeholder="Code leader (8 caractères)"
                value={leaderCode}
                onChangeText={setLeaderCode}
                autoCapitalize="characters"
                maxLength={8}
            />

            {/* Submit Button */}
            <Button style={styles.button} onPress={handleLogin} color="#fff">
                EN ROUTE !
            </Button>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
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
        borderColor: '#BB487C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#BB487C',
    },
    label: {
        marginLeft: 10,
        fontSize: 16,
        color: '#BB487C',
    },
    input: {
        borderWidth: 1,
        borderColor: '#BB487C',
        padding: 12,
        borderRadius: 6,
    },
    inputDisabled: {
        backgroundColor: '#eee',
        color: '#999',
    },

    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#BB487C',
    },
    text: {
        marginHorizontal: 12,
        color: '#BB487C',
        fontSize: 14,
    },

    button: {
        marginTop: 80,
        backgroundColor: '#BB487C',
        padding: 12,
        alignItems: 'center',
    },

    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default LoginBody;
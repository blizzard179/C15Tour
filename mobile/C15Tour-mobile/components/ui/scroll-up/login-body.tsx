import { ThemedText } from "@/components/themed-text";
import { Button } from "@react-navigation/elements";
import { useState, } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";


function LoginBody() {
    const [active, setActive] = useState('');

    return (
        <View style={styles.container}>



            {/* Button A */}
            <TouchableOpacity
                style={styles.row}
                onPress={() => setActive('A')}
            >
                <View style={styles.outer}>
                    {active === 'A' && <View style={styles.inner} />}
                </View>
                <ThemedText style={styles.label}>Participant</ThemedText>
            </TouchableOpacity>

            {/* Input A */}
            <TextInput
                style={[
                    styles.input,
                    active === 'B' && styles.inputDisabled,
                ]}
                editable={active !== 'B'}
                placeholder="participant"
            />

            {/* Separator */}
            <View style={styles.separatorContainer}>
                <View style={styles.line} />
                <Text style={styles.text}>OU</Text>
                <View style={styles.line} />
            </View>

            {/* Button B */}
            <TouchableOpacity
                style={styles.row}
                onPress={() => setActive('B')}
            >
                <View style={styles.outer}>
                    {active === 'B' && <View style={styles.inner} />}
                </View>
                <Text style={styles.label}>Leader</Text>
            </TouchableOpacity>


            {/* Input B */}
            <TextInput
                style={[
                    styles.input,
                    active === 'A' && styles.inputDisabled,
                ]}
                editable={active !== 'A'}
                placeholder="Leader"
            />

            {/* Submit Button */}
            <Button style={styles.button} onPress={() => { console.log("EN ROUTE button pressed"); }} color="#fff">
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
import { ThemedView } from "@/components/themed-view";
import LoginHeader from "./login-header";
import LoginBody from "./login-body";


function  ScrollUp() {
    return (
        <ThemedView>
            <LoginHeader />
            <LoginBody />
        </ThemedView>
    );
} 
export default ScrollUp;
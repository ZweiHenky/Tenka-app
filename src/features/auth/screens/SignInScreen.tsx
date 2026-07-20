import { View, Text, TextInput, TouchableOpacity } from "react-native"

export function SignInScreen() {
  return (
    <View>
      <Text>Sign In</Text>
      <TextInput placeholder="Email" />
      <TextInput placeholder="Password" secureTextEntry />
      <TouchableOpacity onPress={() => {}}>
        <Text>Sign In</Text>
      </TouchableOpacity>
    </View>
  )
}

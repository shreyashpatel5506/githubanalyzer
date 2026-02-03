
import { createClient } from '../utils/supabase/server'

export default async function Page() {
    const supabase = await createClient()

    const { data: todos } = await supabase.from('todos').select()

    return (
        <ul>
            {todos?.map((todo) => (
                <li>{todo}</li>
            ))}
        </ul>
    )
}

import { colors } from "@/colors";

export default function Home() {
  return (
    <div>
      {colors.map((color, index) => (
        <div key={index} style={{ backgroundColor: color, width: '100px', height: '100px', padding: '10px', display: 'inline-block' }}>
        </div>
      ))}
    </div>
  )

}

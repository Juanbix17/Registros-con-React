import { useState } from "react";
import Header from "./components/Header.jsx";
import FormularioDatos from "./components/FormularioDatos.jsx";
import Footer from "./components/footer.jsx";
import FormularioAcademico from "./components/FormularioAcademico.jsx";
import FormularioExperiencia from "./components/FormularioExperiencia.jsx";
import VistaPrevia from "./components/VistaPrevia.jsx";
import "./App.css";

const API_URL = "http://127.0.0.1:5000/api";

// Envía una petición a la API y devuelve el JSON. Lanza error si algo falla.
async function peticion(ruta, cuerpo) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });

  let datos = {};
  try {
    datos = await respuesta.json();
  } catch {
    datos = {};
  }

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || `Error ${respuesta.status} en ${ruta}`);
  }

  return datos;
}

function App() {
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [datos, setDatos] = useState({});
  const [academico, setAcademico] = useState({});
  const [experiencia, setExperiencia] = useState([]);

  const guardarHojaDeVida = async () => {
    setCargando(true);
    setMensaje("");

    try {
      // 1. Datos personales
      // El formulario guarda la imagen en "foto", la API espera "fotografia".
      // edad y ficha salen como texto de los inputs, la API los quiere numéricos.
      const respuestaHV = await peticion("/registrohv", {
        nombre: datos.nombre,
        edad: Number(datos.edad),
        ciudad: datos.ciudad,
        correo: datos.correo,
        fotografia: datos.foto || null,
        programa: datos.programa,
        ficha: Number(datos.ficha),
        jornada: datos.jornada || "Mañana",
      });

      const idHojaVida = respuestaHV.id;

      if (!idHojaVida) {
        throw new Error("La API no devolvió el id de la hoja de vida");
      }

      // Si el correo ya existe la API responde 200 y no crea nada nuevo.
      if (respuestaHV.mensaje && respuestaHV.mensaje.includes("ya está registrado")) {
        throw new Error(
          `Ya existe una hoja de vida con el correo ${datos.correo} (id ${idHojaVida}).`
        );
      }

      // 2. Estudio académico
      // El formulario usa "graduacion", la columna se llama "anio_graduacion".
      if (academico.titulo) {
        await peticion(`/hojas-vida/${idHojaVida}/estudios`, {
          nivel: academico.nivel || "Técnico",
          institucion: academico.institucion,
          titulo: academico.titulo,
          anio_graduacion: Number(academico.graduacion),
        });
      }

      // 3. Cursos (FormularioAcademico los guarda dentro de academico.cursos)
      const cursos = Array.isArray(academico.cursos) ? academico.cursos : [];

      for (const curso of cursos) {
        const nombre = typeof curso === "string" ? curso.trim() : curso?.nombre;
        if (nombre) {
          await peticion(`/hojas-vida/${idHojaVida}/cursos`, { nombre });
        }
      }

      // 4. Experiencias y sus habilidades
      for (const exp of experiencia) {
        const respuestaExp = await peticion(`/hojas-vida/${idHojaVida}/experiencias`, {
          empresa: exp.empresa,
          cargo: exp.cargo,
          tiempo: exp.tiempo,
          funciones: exp.funciones,
        });

        const idExperiencia = respuestaExp.id;

        // Las habilidades llegan como texto separado por comas.
        const listaHabilidades =
          typeof exp.habilidades === "string"
            ? exp.habilidades.split(",").map((h) => h.trim())
            : Array.isArray(exp.habilidades)
            ? exp.habilidades
            : [];

        for (const habilidad of listaHabilidades) {
          const nombre = typeof habilidad === "string" ? habilidad : habilidad?.nombre;
          if (nombre && idExperiencia) {
            await peticion(`/experiencias/${idExperiencia}/habilidades`, { nombre });
          }
        }
      }

      alert(`Hoja de vida guardada con éxito (id ${idHojaVida})`);

      // Reiniciar el formulario
      setDatos({});
      setAcademico({});
      setExperiencia([]);
      setPaso(1);
    } catch (error) {
      console.error(error);
      setMensaje(error.message);
      alert(error.message || "Ocurrió un error al guardar la hoja de vida");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="contenedor">
      <Header />

      {paso === 1 && (
        <FormularioDatos
          datos={datos}
          setDatos={setDatos}
          siguiente={() => setPaso(2)}
        />
      )}

      {paso === 2 && (
        <FormularioAcademico
          datos={academico}
          setDatos={setAcademico}
          siguiente={() => setPaso(3)}
          anterior={() => setPaso(1)}
        />
      )}

      {paso === 3 && (
        <FormularioExperiencia
          datos={experiencia}
          setDatos={setExperiencia}
          anterior={() => setPaso(2)}
          siguiente={() => setPaso(4)}
        />
      )}

      {paso === 4 && (
        <div>
          <VistaPrevia
            datos={datos}
            academico={academico}
            experiencia={experiencia}
            anterior={() => setPaso(3)}
          />

          {mensaje && (
            <p style={{ color: "crimson", textAlign: "center" }}>{mensaje}</p>
          )}

          <div
            className="acciones-finales"
            style={{ marginTop: "20px", textAlign: "center" }}
          >
            <button onClick={() => setPaso(3)} disabled={cargando}>
              Anterior
            </button>
            <button
              onClick={guardarHojaDeVida}
              disabled={cargando}
              style={{ marginLeft: "10px" }}
            >
              {cargando ? "Guardando..." : "Guardar hoja de vida"}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default App;
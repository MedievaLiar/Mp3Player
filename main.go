package main

import (
	"encoding/json"
	"html/template"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
)

type Track struct {
	Title    string `json:"title"`
	Filename string `json:"filename"`
	Cover    string `json:"cover"`
}

func main() {
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("front/static"))))
	http.Handle("/music/", http.StripPrefix("/music/", http.FileServer(http.Dir("music"))))
	http.Handle("/covers/", http.StripPrefix("/covers/", http.FileServer(http.Dir("covers"))))
	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("front/assets"))))
	/*http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("front/assets/images"))))*/

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		files, _ := os.ReadDir("music")
		coverPool, _ := getCoverPool("covers")
		var tracks []Track

		for _, file := range files {
			if !file.IsDir() && strings.HasSuffix(file.Name(), ".mp3") {
				tracks = append(tracks, Track{
					Title:    strings.TrimSuffix(file.Name(), ".mp3"),
					Filename: file.Name(),
					Cover:    getRandomCover(coverPool),
				})
			}
		}

		tmpl := template.Must(template.ParseFiles("front/templates/index.html"))
		tmpl.Execute(w, map[string]any{
			"Tracks": tracks,
		})
	})

	http.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		files, _ := os.ReadDir("music")
		coverPool, _ := getCoverPool("covers")

		var results []Track
		for _, file := range files {
			if !file.IsDir() && strings.HasSuffix(file.Name(), ".mp3") {
				title := strings.TrimSuffix(file.Name(), ".mp3")
				if strings.Contains(strings.ToLower(title), strings.ToLower(query)) {
					results = append(results, Track{
						Title:    title,
						Filename: file.Name(),
						Cover:    getRandomCover(coverPool),
					})
				}
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	})

	log.Println("Server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func getCoverPool(dir string) ([]string, error) {
	var covers []string
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() && (strings.HasSuffix(entry.Name(), ".jpg") || strings.HasSuffix(entry.Name(), ".png")) {
			covers = append(covers, entry.Name())
		}
	}
	return covers, nil
}

func getRandomCover(coverPool []string) string {
	if len(coverPool) == 0 {
		return "default.jpg"
	}
	return coverPool[rand.Intn(len(coverPool))]
}

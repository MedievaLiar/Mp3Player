package main

import (
	"html/template"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
)

type Track struct {
	Title    string
	Filename string
	Cover    string
}

func main() {
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("front/static"))))
	http.Handle("/music/", http.StripPrefix("/music/", http.FileServer(http.Dir("music"))))
	http.Handle("/covers/", http.StripPrefix("/covers/", http.FileServer(http.Dir("covers"))))
	http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("front/assets/images"))))


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

		template.Must(template.ParseFiles("front/templates/index.html")).Execute(w, map[string]any{
			"Tracks": tracks,
		})
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
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".jpg") {
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

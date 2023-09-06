import * as cheerio from 'cheerio'
import 'dotenv/config'

export class WeatherService {
    constructor(settings) {
        this.weatherLinkSettings = settings
    }

    getLhp() {
        const lhpId = process.env.LHP_ID
        console.log(lhpId)
        const url = `https://aro.lfv.se/Links/Link/ViewLink?TorLinkId=${lhpId}&type=MET`

        const fetchOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'text/html' },
        }

        return fetch(url, fetchOptions)
            .then(response => response.text())
            .then(html => {
                const $ = cheerio.load(html)
                const pre = $('pre')
                    .filter((index, element) =>
                        decodeURIComponent($(element).text()).startsWith(
                            'PROGNOS FÖR OMRÅDE se34',
                        ),
                    )
                    .toArray()

                if (pre.length === 0) {
                    return null
                }

                const text = decodeURIComponent($(pre[0]).text())
                return this.getWeatherLhpRows(text)
            })
    }

    getRowKey(time) {
        const formattedTime = time.toISOString().slice(0, 16).replace('T', ' ')
        return formattedTime
    }

    getPartitionKey(time, withTime = true) {
        if (!withTime) {
            return time.toISOString().slice(0, 10)
        }
        return time.toISOString().slice(0, 13).replace('T', ' ')
    }

    getWeatherLhpRows(preText) {
        const weatherRows = []
        const lines = preText.split('\n')
        let validDuringDay = new Date()
        let fl2 = false
        let fl5 = false
        let fl10 = false

        for (const line of lines) {
            if (line.startsWith('GÄLLANDE DEN')) {
                const result = line
                    .substring(
                        line.indexOf('DEN') + 4,
                        line.indexOf('MELLAN') - 1,
                    )
                    .trim()
                validDuringDay = this.parseSwedishDateTime(result)
            }

            if (line.trim() === '') {
                fl2 = false
                fl5 = false
                fl10 = false
            }

            if (fl2) {
                weatherRows.push(
                    this.lineToLhpWeatherRow(2000, line, validDuringDay),
                )
            } else if (fl5) {
                weatherRows.push(
                    this.lineToLhpWeatherRow(5000, line, validDuringDay),
                )
            } else if (fl10) {
                weatherRows.push(
                    this.lineToLhpWeatherRow(10000, line, validDuringDay),
                )
            }

            if (line.startsWith('2000ft:')) {
                fl2 = true
            } else if (line.startsWith('FL050:')) {
                fl5 = true
            } else if (line.startsWith('FL100:')) {
                fl10 = true
            }
        }

        return weatherRows
    }

    parseSwedishDateTime(swedishDateTime) {
        const parts = swedishDateTime.trim().split(' ')
        const day = parseInt(parts[0])
        const month = this.swedishMonthToNumber(parts[1])
        const year = parseInt(parts[2])
        return new Date(Date.UTC(year, month - 1, day))
    }

    swedishMonthToNumber(month) {
        const months = {
            JANUARI: 1,
            FEBRUARI: 2,
            MARS: 3,
            APRIL: 4,
            MAJ: 5,
            JUNI: 6,
            JULI: 7,
            AUGUSTI: 8,
            SEPTEMBER: 9,
            OKTOBER: 10,
            NOVEMBER: 11,
            DECEMBER: 12,
        }
        return months[month.toUpperCase()]
    }

    lineToLhpWeatherRow(altitude, line, validDuringDay) {
        console.log(line)
        const timeRegex = /(\d{2})-(\d{2})UTC:/
        const windDirectionRegex = /(\d{3})\/(\d{2})kt/
        const temperatureRegex = /(\+\d+)/

        // Use the regular expressions to extract the values
        const timeMatch = line.match(timeRegex)
        const windDirectionMatch = line.match(windDirectionRegex)
        const temperatureMatch = line.match(temperatureRegex)

        // Check if matches were found and extract the values
        const time = timeMatch
            ? { from: parseInt(timeMatch[1]), to: parseInt(timeMatch[2]) }
            : null
        const windDirection = windDirectionMatch ? windDirectionMatch[1] : null
        const windSpeed = windDirectionMatch ? windDirectionMatch[2] : null
        const temperature = temperatureMatch ? temperatureMatch[1] : null

        console.log('Time:', time)
        console.log('Wind Direction:', windDirection)
        console.log('Wind Speed:', windSpeed)
        console.log('Temperature:', temperature)

        const weatherRow = {
            PartitionKey: this.getPartitionKey(validDuringDay, false),
            RowKey: this.getRowKey(new Date()),
            Altitude: altitude,
            From: new Date(
                validDuringDay.getFullYear(),
                validDuringDay.getMonth(),
                validDuringDay.getDate(),
                time.from,
                0,
                0,
            ),
            To: new Date(
                validDuringDay.getFullYear(),
                validDuringDay.getMonth(),
                validDuringDay.getDate(),
                time.to,
                0,
                0,
            ),
            WindDir: parseInt(windDirection),
            WindSpd: parseInt(windSpeed),
            Temp: parseInt(temperature),
        }

        return weatherRow
    }

    toMetersPerSecond(value) {
        return parseFloat(value) * 0.44704
    }
}
